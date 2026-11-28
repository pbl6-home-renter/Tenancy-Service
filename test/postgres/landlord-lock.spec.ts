import { memoryPostgres } from '../support/postgres-memory';
import { AddLandlordLockStates1795834976234 } from 'database/migrations/1795834976234-AddLandlordLockStates';
import { BuildingTypeormEntity } from 'modules/building/infrastructure/persistence/building.typeorm-entity';
import { TypeOrmBuildingRepository } from 'modules/building/infrastructure/persistence/building.repository';
import { BuildingSearchPublicQueryHandler } from 'modules/building/application/queries/building-search-public/building-search-public.query.handler';
import { BuildingGetPublicQueryHandler } from 'modules/building/application/queries/building-get-public/building-get-public.query.handler';
import { BuildingNotFoundException } from 'modules/building/domain/exceptions/building-not-found.exception';
import { RoomTypeormEntity } from 'modules/room/infrastructure/persistence/room.typeorm-entity';
import { ContractTypeormEntity } from 'modules/contract/infrastructure/persistence/contract.entity';
import { ContractMemberTypeormEntity } from 'modules/contract/infrastructure/persistence/contract-member.entity';
import { TypeOrmContractReadRepository } from 'modules/contract/infrastructure/persistence/contract-read.repository';
import { ContractMyListResponseDto } from 'modules/contract/presentation/http/responses/contract-my-list.response.dto';
import { InvoiceTypeormEntity } from 'modules/invoice/infrastructure/persistence/invoice.typeorm-entity';
import { TypeOrmInvoiceReadAdapter } from 'modules/invoice/infrastructure/persistence/invoice-read.adapter';
import { InvoiceTenantDetailResponseDto } from 'modules/invoice/presentation/http/responses/invoice-tenant-detail.response.dto';
import { InvoiceDetailResponseDto } from 'modules/invoice/presentation/http/responses/invoice-detail.response.dto';
import { InvoiceMyListResponseDto } from 'modules/invoice/presentation/http/responses/invoice-my-list.response.dto';
import { LandlordLockStateTypeormEntity } from 'modules/landlord-lock/infrastructure/persistence/landlord-lock-state.typeorm-entity';
import { TypeOrmLandlordLockRepository } from 'modules/landlord-lock/infrastructure/persistence/landlord-lock.repository';
import { IdentityLifecycleSubscriber } from 'modules/contract/presentation/messaging/identity-lifecycle.subscriber';
import { InboxTypeormEntity } from 'modules/inbox/infrastructure/persistence/inbox.typeorm-entity';
import { TypeOrmInboxRepository } from 'modules/inbox/infrastructure/persistence/inbox.repository';
import { TypeOrmUnitOfWork } from 'shared/infrastructure/database/transaction/typeorm-unit-of-work';
import { IntegrationEvent } from 'shared/application/messaging/integration-event';
import { generateUuid, Uuid } from 'shared/domain/value-objects/uuid.vo';
import { createLinkDependencies } from '../unit/contract/support/contract-link.fixture';

jest.setTimeout(30000);
jest.mock('@golevelup/nestjs-rabbitmq', () => ({
  RabbitSubscribe: () => () => undefined,
}));
jest.mock('@nestjs/swagger', () => ({
  ApiProperty: () => () => undefined,
  ApiPropertyOptional: () => () => undefined,
  OmitType: (base: unknown) => base,
}));
jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

describe('P13-04 landlord lock projection on PostgreSQL', () => {
  let db: Awaited<ReturnType<typeof memoryPostgres>>;
  let locks: TypeOrmLandlordLockRepository;
  let buildings: TypeOrmBuildingRepository;
  let invoices: TypeOrmInvoiceReadAdapter;
  let contracts: TypeOrmContractReadRepository;
  const options = { pageNo: 1, pageSize: 1 };
  const landlordId = generateUuid(),
    tenantId = generateUuid();
  const buildingId = generateUuid(),
    roomId = generateUuid(),
    contractId = generateUuid(),
    invoiceId = generateUuid();
  const lockedAt = '2026-11-28T00:00:00.000Z';

  beforeAll(async () => {
    db = await memoryPostgres([
      BuildingTypeormEntity,
      RoomTypeormEntity,
      ContractTypeormEntity,
      ContractMemberTypeormEntity,
      InvoiceTypeormEntity,
      InboxTypeormEntity,
      LandlordLockStateTypeormEntity,
    ]);
    // Exercise the generated migration, including down/up, before using it.
    db.source.getMetadata(LandlordLockStateTypeormEntity).synchronize = false;
    await db.source.synchronize();
    const migration = new AddLandlordLockStates1795834976234();
    const runner = db.source.createQueryRunner();
    await migration.up(runner);
    await migration.down(runner);
    expect(
      (
        await db.postgres.query(
          "SELECT to_regclass('landlord_lock_states') AS name",
        )
      ).rows,
    ).toEqual([{ name: null }]);
    await migration.up(runner);
    locks = new TypeOrmLandlordLockRepository(
      db.source.getRepository(LandlordLockStateTypeormEntity),
    );
    buildings = new TypeOrmBuildingRepository(
      db.source.getRepository(BuildingTypeormEntity),
    );
    contracts = new TypeOrmContractReadRepository(
      db.source.getRepository(ContractTypeormEntity),
    );
    invoices = new TypeOrmInvoiceReadAdapter(
      db.source.getRepository(InvoiceTypeormEntity),
    );
    await db.postgres.query(
      `INSERT INTO buildings
      (id,landlord_id,name,address,ward,province,latitude,longitude,status)
      VALUES ($1,$2,'Locked building','12 Street','Ward','Province',16,108,'approved'),
      ($3,$4,'Visible building','14 Street','Ward','Province',16,108,'approved')`,
      [buildingId, landlordId, generateUuid(), generateUuid()],
    );
    await db.postgres.query(
      `INSERT INTO rooms
      (id,landlord_id,building_id,name,rent_price,deposit_amount)
      VALUES ($1,$2,$3,'101',100,0)`,
      [roomId, landlordId, buildingId],
    );
    await db.postgres.query(
      `INSERT INTO contracts
      (id,room_id,landlord_id,tenant_id,tenant_name,tenant_phone,status,rent_price,deposit_amount,start_date,end_date)
      VALUES ($1,$2,$3,$4,'Tenant','0912345678','active',100,0,'2026-01-01','2026-12-31')`,
      [contractId, roomId, landlordId, tenantId],
    );
    await db.postgres.query(
      `INSERT INTO invoices
      (id,contract_id,code,period,rent_amount,total_amount,status,issued_at)
      VALUES ($1,$2,'INV-202611-ABCD','2026-11',100,100,'issued',now())`,
      [invoiceId, contractId],
    );
  });
  afterAll(async () => db?.close());
  beforeEach(async () => {
    await db.source.getRepository(InboxTypeormEntity).clear();
    await db.source.getRepository(LandlordLockStateTypeormEntity).clear();
  });

  async function assertTenantFlag(expected: boolean) {
    const list = await contracts.findPageByTenant(tenantId, options);
    expect(
      ContractMyListResponseDto.fromReadModel(list.data[0]).landlordLocked,
    ).toBe(expected);
    const invoiceList = await invoices.findPageByTenant(tenantId, options);
    expect(
      InvoiceMyListResponseDto.fromView(invoiceList.data[0]).landlordLocked,
    ).toBe(expected);
    const detail = await invoices.findIssuedByIdForTenant(invoiceId, tenantId);
    expect(
      InvoiceTenantDetailResponseDto.fromView(detail!).landlordLocked,
    ).toBe(expected);
    expect(
      await invoices.findIssuedByIdForTenant(invoiceId, generateUuid()),
    ).toBeNull();
    // The owner representation is unchanged.
    expect(
      InvoiceDetailResponseDto.fromView((await invoices.findById(invoiceId))!),
    ).not.toHaveProperty('landlordLocked');
  }

  it('hides only public buildings, counts pagination after exclusion, preserves owner/admin access and restores tenant flags on unlock', async () => {
    const search = new BuildingSearchPublicQueryHandler(buildings);
    const detail = new BuildingGetPublicQueryHandler(buildings);
    expect((await search.execute({ options })).pagination.totalItems).toBe(2);
    await assertTenantFlag(false);
    await locks.setState(landlordId, new Date(lockedAt), true);
    const hidden = await search.execute({ options });
    expect(hidden.pagination.totalItems).toBe(1);
    expect(hidden.data).toHaveLength(1);
    expect(hidden.data[0].id).not.toBe(buildingId);
    await expect(detail.execute({ buildingId })).rejects.toThrow(
      BuildingNotFoundException,
    );
    expect(
      (await buildings.findPaginatedForAdmin(options)).pagination.totalItems,
    ).toBe(2);
    expect(
      (await buildings.findMyBuildings(landlordId, options)).data[0].id,
    ).toBe(buildingId);
    expect(
      (await buildings.findMyBuildingById(landlordId, buildingId))?.id,
    ).toBe(buildingId);
    await assertTenantFlag(true);
    await locks.setState(landlordId, new Date(lockedAt), false);
    expect((await search.execute({ options })).pagination.totalItems).toBe(2);
    expect((await detail.execute({ buildingId })).status).toBe('approved');
    expect(
      (
        await db.postgres.query('SELECT status FROM contracts WHERE id=$1', [
          contractId,
        ])
      ).rows,
    ).toEqual([{ status: 'active' }]);
    await assertTenantFlag(false);
  });

  it('keeps unlock-before-lock, replayed snapshots and old lock cycles from overriding the latest state', async () => {
    const first = new Date(lockedAt),
      next = new Date('2026-11-29T00:00:00.000Z');
    await locks.setState(landlordId, first, false);
    await locks.setState(landlordId, first, true); // Delayed lock or initial backfill.
    expect(await locks.isLocked(landlordId)).toBe(false);
    await locks.setState(landlordId, next, true);
    await locks.setState(landlordId, first, false); // Old unlock after relock.
    expect(await locks.isLocked(landlordId)).toBe(true);
    await locks.setState(landlordId, next, false);
    await locks.setState(landlordId, next, true);
    expect(await locks.isLocked(landlordId)).toBe(false);
    expect(
      await db.source.getRepository(LandlordLockStateTypeormEntity).count(),
    ).toBe(1);
  });

  function event(
    userId: Uuid,
    role: string,
    locked: boolean,
  ): IntegrationEvent {
    return {
      id: generateUuid(),
      aggregateId: userId,
      aggregateType: 'user',
      eventType: locked ? 'user.locked' : 'user.unlocked',
      routingKey: locked ? 'user.locked' : 'user.unlocked',
      occurredAt: '2026-11-28T01:00:00.000Z',
      payload: { userId, role, status: locked ? 'locked' : 'active', lockedAt },
    };
  }

  it('updates the projection and inbox atomically, deduplicates events and ignores tenant locks', async () => {
    const deps = createLinkDependencies();
    const subscriber = new IdentityLifecycleSubscriber(
      deps.projection,
      {} as never,
      {} as never,
      deps.outbox as never,
      new TypeOrmInboxRepository(db.source.getRepository(InboxTypeormEntity)),
      new TypeOrmUnitOfWork(db.source),
      locks,
    );
    const lock = event(landlordId, 'landlord', true);
    await subscriber.handle(lock);
    await subscriber.handle(lock);
    expect(await locks.isLocked(landlordId)).toBe(true);
    expect(await db.source.getRepository(InboxTypeormEntity).count()).toBe(1);
    await subscriber.handle(event(landlordId, 'landlord', false));
    await subscriber.handle(event(tenantId, 'tenant', true));
    expect(await locks.isLocked(landlordId)).toBe(false);
    expect(
      await db.source
        .getRepository(LandlordLockStateTypeormEntity)
        .findOneBy({ userId: tenantId }),
    ).toBeNull();
    expect(deps.projection.delete).toHaveBeenCalled();
    expect(deps.outbox.append).not.toHaveBeenCalled();

    const failure = event(generateUuid(), 'landlord', true);
    const failingSubscriber = new IdentityLifecycleSubscriber(
      deps.projection,
      {} as never,
      {} as never,
      deps.outbox as never,
      new TypeOrmInboxRepository(db.source.getRepository(InboxTypeormEntity)),
      new TypeOrmUnitOfWork(db.source),
      {
        isLocked: (id) => locks.isLocked(id),
        setState: async (...args) => {
          await locks.setState(...args);
          throw new Error('rollback');
        },
      },
    );
    await expect(failingSubscriber.handle(failure)).rejects.toThrow('rollback');
    expect(await locks.isLocked(failure.aggregateId)).toBe(false);
    expect(
      await db.source
        .getRepository(InboxTypeormEntity)
        .findOneBy({ messageId: failure.id }),
    ).toBeNull();
  });
});
