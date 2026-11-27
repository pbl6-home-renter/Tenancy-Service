import { memoryPostgres } from '../support/postgres-memory';
import { ContractTypeormEntity } from 'modules/contract/infrastructure/persistence/contract.entity';
import { ContractMemberTypeormEntity } from 'modules/contract/infrastructure/persistence/contract-member.entity';
import { TenantUserProjectionTypeormEntity } from 'modules/contract/infrastructure/persistence/tenant-user-projection.typeorm-entity';
import { RoomTypeormEntity } from 'modules/room/infrastructure/persistence/room.typeorm-entity';
import { BuildingTypeormEntity } from 'modules/building/infrastructure/persistence/building.typeorm-entity';
import { OutboxTypeormEntity } from 'modules/outbox/infrastructure/persistence/outbox.typeorm-entity';
import { TypeOrmContractRepository } from 'modules/contract/infrastructure/persistence/contract.repository';
import { TypeOrmContractReadRepository } from 'modules/contract/infrastructure/persistence/contract-read.repository';
import { TypeOrmContractMemberRepository } from 'modules/contract/infrastructure/persistence/contract-member.repository';
import { TypeOrmTenantUserProjectionRepository } from 'modules/contract/infrastructure/persistence/tenant-user-projection.repository';
import { TypeOrmRoomRepository } from 'modules/room/infrastructure/persistence/room.repository';
import { TypeOrmBuildingRepository } from 'modules/building/infrastructure/persistence/building.repository';
import { TypeOrmOutboxRepository } from 'modules/outbox/infrastructure/persistence/outbox.repository';
import { TypeOrmUnitOfWork } from 'shared/infrastructure/database/transaction/typeorm-unit-of-work';
import { ContractCreateCommandHandler } from 'modules/contract/application/commands/contract-create/contract-create.command.handler';
import { ContractCreateCommand } from 'modules/contract/application/commands/contract-create/contract-create.command';
import { ContractActivateCommandHandler } from 'modules/contract/application/commands/contract-activate/contract-activate.command.handler';
import { ContractActivateCommand } from 'modules/contract/application/commands/contract-activate/contract-activate.command';
import { ContractMemberNotificationSnapshotService } from 'modules/contract/application/services/contract-member-notification-snapshot.service';
import { TenantPhone } from 'modules/contract/domain/value-objects/tenant-phone.vo';
import { ContractStatus } from 'modules/contract/domain/enums/contract-status.enum';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';

jest.setTimeout(30000);
jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

describe('Contract tenant linking on PostgreSQL', () => {
  let db: Awaited<ReturnType<typeof memoryPostgres>>;
  let contracts: TypeOrmContractRepository;
  let members: TypeOrmContractMemberRepository;
  let projection: TypeOrmTenantUserProjectionRepository;
  let rooms: TypeOrmRoomRepository;
  let notificationSnapshots: ContractMemberNotificationSnapshotService;
  let outbox: TypeOrmOutboxRepository;
  let uow: TypeOrmUnitOfWork;

  beforeAll(async () => {
    db = await memoryPostgres([
      RoomTypeormEntity,
      BuildingTypeormEntity,
      ContractTypeormEntity,
      ContractMemberTypeormEntity,
      TenantUserProjectionTypeormEntity,
      OutboxTypeormEntity,
    ]);
    await db.source.synchronize();
    contracts = new TypeOrmContractRepository(
      db.source.getRepository(ContractTypeormEntity),
    );
    members = new TypeOrmContractMemberRepository(
      db.source.getRepository(ContractMemberTypeormEntity),
    );
    projection = new TypeOrmTenantUserProjectionRepository(
      db.source.getRepository(TenantUserProjectionTypeormEntity),
    );
    rooms = new TypeOrmRoomRepository(
      db.source.getRepository(RoomTypeormEntity),
    );
    notificationSnapshots = new ContractMemberNotificationSnapshotService(
      rooms,
      new TypeOrmBuildingRepository(
        db.source.getRepository(BuildingTypeormEntity),
      ),
    );
    outbox = new TypeOrmOutboxRepository(
      db.source.getRepository(OutboxTypeormEntity),
    );
    uow = new TypeOrmUnitOfWork(db.source);
  });
  afterAll(async () => {
    await db?.close();
  });

  async function draft(phone: string) {
    const buildingId = generateUuid(),
      landlordId = generateUuid(),
      roomId = generateUuid();
    await db.postgres.query(
      `INSERT INTO buildings (id, landlord_id, name, address, ward, province, latitude, longitude, status)
      VALUES ($1, $2, 'Building', '12 Street', 'Ward', 'Province', 16, 108, 'approved')`,
      [buildingId, landlordId],
    );
    await db.postgres.query(
      `INSERT INTO rooms (id, landlord_id, building_id, name, rent_price, deposit_amount)
      VALUES ($1, $2, $3, '101', 100, 0)`,
      [roomId, landlordId, buildingId],
    );
    const handler = new ContractCreateCommandHandler(
      contracts,
      rooms,
      uow,
      outbox,
      projection,
    );
    return handler.execute(
      new ContractCreateCommand(
        landlordId,
        roomId,
        null,
        'Tenant',
        phone,
        0,
        100,
        '2026-01-01',
        '2026-12-31',
        0,
      ),
    );
  }

  async function activate(contract: Awaited<ReturnType<typeof draft>>) {
    const mediaId = generateUuid();
    const handler = new ContractActivateCommandHandler(
      members,
      contracts,
      rooms,
      uow,
      outbox,
      {
        findMedia: async () => null,
        findMediaByIds: async () => [
          {
            id: mediaId,
            ownerType: 'contract',
            ownerId: contract.id,
            status: 'uploaded',
            purpose: 'contract_signed',
          },
        ],
      },
      projection,
      notificationSnapshots,
    );
    return handler.execute(
      new ContractActivateCommand(contract.id, contract.landlordId, [mediaId]),
    );
  }

  it('links an account that predates the contract, activates its representative, and scopes tenant access', async () => {
    const tenantId = generateUuid();
    await uow.run((ctx) =>
      projection.upsert(tenantId, TenantPhone.create('0912345678'), ctx),
    );
    const contract = await draft('+84912345678');
    expect(contract.tenantId).toBe(tenantId);
    const read = new TypeOrmContractReadRepository(
      db.source.getRepository(ContractTypeormEntity),
    );
    expect(
      (
        await read.findPageByTenant(tenantId, {
          pageNo: 1,
          pageSize: 20,
          filter: { status: ContractStatus.ACTIVE },
        })
      ).data,
    ).toEqual([]);
    await activate(contract);
    expect(
      (
        await read.findPageByTenant(tenantId, { pageNo: 1, pageSize: 20 })
      ).data.map((item) => item.id),
    ).toContain(contract.id);
    expect(
      (await read.findPageByTenant(generateUuid(), { pageNo: 1, pageSize: 20 }))
        .data,
    ).toEqual([]);
    expect((await members.findActiveByContract(contract.id))[0].tenantId).toBe(
      tenantId,
    );
    const event = await db.source
      .getRepository(OutboxTypeormEntity)
      .findOneByOrFail({
        aggregateId: contract.id,
        eventType: 'contract.activated',
      });
    expect(event.payload.tenantUserIds).toEqual([tenantId]);
  });

  it('links an older NULL draft when the projection arrives before activation', async () => {
    const contract = await draft('0922345678');
    expect(contract.tenantId).toBeNull();
    const tenantId = generateUuid();
    await uow.run((ctx) =>
      projection.upsert(tenantId, TenantPhone.create('+84922345678'), ctx),
    );
    await activate(contract);
    expect((await contracts.findById(contract.id))?.tenantId).toBe(tenantId);
    expect((await members.findActiveByContract(contract.id))[0].tenantId).toBe(
      tenantId,
    );
  });
});
