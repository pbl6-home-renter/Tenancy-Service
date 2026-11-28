import { LandlordLockStateTypeormEntity } from 'modules/landlord-lock/infrastructure/persistence/landlord-lock-state.typeorm-entity';
import { TypeOrmLandlordLockRepository } from 'modules/landlord-lock/infrastructure/persistence/landlord-lock.repository';
import { IdentityLifecycleSubscriber } from 'modules/contract/presentation/messaging/identity-lifecycle.subscriber';
import { InboxTypeormEntity } from 'modules/inbox/infrastructure/persistence/inbox.typeorm-entity';
import { TypeOrmInboxRepository } from 'modules/inbox/infrastructure/persistence/inbox.repository';
import { TypeOrmRoomHubPageQuery } from 'modules/contract/infrastructure/persistence/room-hub-page-query';
import { TypeOrmRoomActiveContractChecker } from 'modules/room/infrastructure/persistence/room-active-contract-checker';
import { TypeOrmContractTenantReadQuery } from 'modules/contract/infrastructure/persistence/contract-tenant-read.query';
import { ContractCheckoutCompleteCommandHandler } from 'modules/contract/application/commands/contract-checkout-complete/contract-checkout-complete.command.handler';
import { ContractCheckoutCompleteCommand } from 'modules/contract/application/commands/contract-checkout-complete/contract-checkout-complete.command';
import { ContractUpdateCommandHandler } from 'modules/contract/application/commands/contract-update/contract-update.command.handler';
import { ContractUpdateCommand } from 'modules/contract/application/commands/contract-update/contract-update.command';
import { IntegrationEvent } from 'shared/application/messaging/integration-event';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
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
jest.mock('@golevelup/nestjs-rabbitmq', () => ({
  RabbitSubscribe: () => () => undefined,
}));
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
      InboxTypeormEntity,
      LandlordLockStateTypeormEntity,
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
  function subscriber() {
    return new IdentityLifecycleSubscriber(
      projection,
      contracts,
      members,
      outbox,
      new TypeOrmInboxRepository(db.source.getRepository(InboxTypeormEntity)),
      uow,
      new TypeOrmLandlordLockRepository(
        db.source.getRepository(LandlordLockStateTypeormEntity),
      ),
    );
  }

  function lifecycle(
    userId: Uuid,
    role: 'tenant' | 'landlord',
    locked: boolean,
    phone = '0932345678',
  ): IntegrationEvent {
    return {
      id: generateUuid(),
      aggregateId: userId,
      aggregateType: 'User',
      eventType: locked ? 'user.locked' : 'user.unlocked',
      routingKey: locked ? 'user.locked' : 'user.unlocked',
      occurredAt: '2026-11-21T00:00:00.000Z',
      payload: {
        userId,
        role,
        status: locked ? 'locked' : 'active',
        phone,
        lockedAt: '2026-11-20T00:00:00.000Z',
      },
    };
  }

  it('keeps room hub and contract/invoice inputs available across delayed and duplicate landlord events', async () => {
    const tenantId = generateUuid();
    await uow.run((ctx) =>
      projection.upsert(tenantId, TenantPhone.create('0932345678'), ctx),
    );
    const contract = await activate(await draft('0932345678'));
    const before = await db.source
      .getRepository(ContractTypeormEntity)
      .findOneByOrFail({ id: contract.id });
    const messages = await db.source.getRepository(OutboxTypeormEntity).count();
    const handler = subscriber();
    const lock = lifecycle(contract.landlordId, 'landlord', true);
    const unlock = lifecycle(contract.landlordId, 'landlord', false);
    // Unlock can arrive before its lock, then both may be redelivered.
    for (const event of [
      unlock,
      lock,
      lock,
      unlock,
      { ...lock, id: generateUuid() },
    ])
      await handler.handle(event);
    expect(
      await db.source
        .getRepository(ContractTypeormEntity)
        .findOneByOrFail({ id: contract.id }),
    ).toEqual(before);
    expect(await db.source.getRepository(OutboxTypeormEntity).count()).toBe(
      messages,
    );
    expect(
      await db.source
        .getRepository(InboxTypeormEntity)
        .countBy({ eventType: 'user.locked' }),
    ).toBe(2);
    const hub = new TypeOrmRoomHubPageQuery(
      db.source.getRepository(ContractTypeormEntity),
    );
    expect(
      (await hub.findPage(tenantId, { pageNo: 1, pageSize: 20 })).data.map(
        (row) => row.contractId,
      ),
    ).toContain(contract.id);
    await new ContractUpdateCommandHandler(contracts, uow, outbox).execute(
      new ContractUpdateCommand(contract.id, contract.landlordId, {
        vehicleCount: 2,
      }),
    );
    // Invoice generation reads active contracts in this building/period.
    const room = await rooms.findById(contract.roomId);
    expect(
      (
        await contracts.findActiveInBuildingPeriod(
          room!.buildingId,
          '2026-11-01',
          '2026-11-30',
        )
      ).map((row) => row.id),
    ).toContain(contract.id);
  });

  it('keeps tenant links on lock, blocks new auto-linking, and rolls back inbox/projection/linking with outbox failure on unlock', async () => {
    const phone = '0942345678',
      tenantId = generateUuid();
    await uow.run((ctx) =>
      projection.upsert(tenantId, TenantPhone.create(phone), ctx),
    );
    const current = await activate(await draft(phone));
    const handler = subscriber();
    await handler.handle(lifecycle(tenantId, 'tenant', true, phone));
    expect(
      await uow.run((ctx) =>
        projection.findTenantIdByPhone(TenantPhone.create(phone), ctx),
      ),
    ).toBeNull();
    expect((await contracts.findById(current.id))?.tenantId).toBe(tenantId);
    expect((await members.findActiveByContract(current.id))[0].tenantId).toBe(
      tenantId,
    );
    const unlinked = await activate(await draft(phone));
    expect(unlinked.tenantId).toBeNull();
    const unlock = lifecycle(tenantId, 'tenant', false, phone);
    const append = jest
      .spyOn(outbox, 'append')
      .mockRejectedValueOnce(new Error('outbox unavailable'));
    await expect(handler.handle(unlock)).rejects.toThrow('outbox unavailable');
    expect(
      await uow.run((ctx) =>
        projection.findTenantIdByPhone(TenantPhone.create(phone), ctx),
      ),
    ).toBeNull();
    expect((await contracts.findById(unlinked.id))?.tenantId).toBeNull();
    expect(
      await db.source
        .getRepository(InboxTypeormEntity)
        .countBy({ messageId: unlock.id }),
    ).toBe(0);
    append.mockRestore();
    await handler.handle(unlock);
    expect((await contracts.findById(unlinked.id))?.tenantId).toBe(tenantId);
    expect((await members.findActiveByContract(unlinked.id))[0].tenantId).toBe(
      tenantId,
    );
    const messages = await db.source
      .getRepository(OutboxTypeormEntity)
      .findBy({ eventType: 'notification.requested' });
    expect(
      messages.some(
        (row) =>
          (row.payload.notification as { data: { messageKey: string } }).data
            .messageKey === 'contract.member_linked',
      ),
    ).toBe(true);
    const count = messages.length;
    await handler.handle(unlock);
    expect(
      await db.source
        .getRepository(OutboxTypeormEntity)
        .countBy({ eventType: 'notification.requested' }),
    ).toBe(count);
  });

  it('retains legacy occupancy, tenant current membership and checkout without any lock-cycle table', async () => {
    const base = await draft('0952345678');
    const create = new ContractCreateCommandHandler(
      contracts,
      rooms,
      uow,
      outbox,
      projection,
    );
    const createSameRoom = () =>
      create.execute(
        new ContractCreateCommand(
          base.landlordId,
          base.roomId,
          null,
          'Another tenant',
          '0962345678',
          0,
          100,
          '2026-01-01',
          '2026-12-31',
          0,
        ),
      );
    const pending = await createSameRoom();
    const contract = await activate(base);
    const marker = generateUuid();
    await db.postgres.query(
      "UPDATE contracts SET status = 'terminated', lock_termination_cycle_id = $1 WHERE id = $2",
      [marker, contract.id],
    );
    const repository = db.source.getRepository(ContractTypeormEntity);
    const checker = new TypeOrmRoomActiveContractChecker(repository);
    const tenantRead = new TypeOrmContractTenantReadQuery(
      db.source.getRepository(ContractMemberTypeormEntity),
    );
    const member = (await members.findActiveByContract(contract.id))[0];
    expect((await contracts.findById(contract.id))?.handoverRequired).toBe(
      true,
    );
    expect(await contracts.existsBlockingByRoom(contract.roomId, null)).toBe(
      true,
    );
    expect(await checker.hasActiveContract(contract.roomId)).toBe(true);
    expect(
      (await tenantRead.findByMemberId(contract.landlordId, member.id))?.scope,
    ).toBe('current');
    await expect(createSameRoom()).rejects.toMatchObject({
      code: 'ACTIVE_CONTRACT_EXISTS',
    });
    await expect(activate(pending)).rejects.toMatchObject({
      code: 'ACTIVE_CONTRACT_EXISTS',
    });
    // The database independently rejects another active contract in the room.
    await expect(
      db.postgres.query(
        `INSERT INTO contracts (landlord_id,room_id,tenant_id,status,deposit_amount,rent_price,start_date,end_date) VALUES ($1,$2,$3,'active',0,100,'2026-01-01','2026-12-31')`,
        [contract.landlordId, contract.roomId, generateUuid()],
      ),
    ).rejects.toMatchObject({ code: '23505' });
    const settlement = { isPeriodSettled: jest.fn(async () => false) };
    const checkout = new ContractCheckoutCompleteCommandHandler(
      contracts,
      members,
      rooms,
      settlement,
      uow,
      outbox,
      notificationSnapshots,
    );
    const command = new ContractCheckoutCompleteCommand(
      contract.id,
      contract.landlordId,
      new Date('2026-11-20'),
    );
    await checkout.execute(command);
    const saved = await contracts.findById(contract.id);
    expect(saved?.status).toBe('terminated');
    expect(saved?.lockTerminationCycleId).toBe(marker);
    expect(saved?.handoverCompletedOn).toBe('2026-11-20');
    expect(saved?.handoverRequired).toBe(false);
    expect(settlement.isPeriodSettled).not.toHaveBeenCalled();
    expect(await contracts.existsBlockingByRoom(contract.roomId, null)).toBe(
      false,
    );
    expect(await checker.hasActiveContract(contract.roomId)).toBe(false);
    expect((await rooms.findById(contract.roomId))?.status).toBe('maintenance');
    expect(
      (await tenantRead.findByMemberId(contract.landlordId, member.id))?.scope,
    ).toBe('history');
    const count = await db.source.getRepository(OutboxTypeormEntity).count();
    await checkout.execute(command);
    expect(await db.source.getRepository(OutboxTypeormEntity).count()).toBe(
      count,
    );
  });
});
