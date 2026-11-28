import { memoryPostgres } from '../support/postgres-memory';
import { RoommateProfileEntity } from 'modules/roommate-profile/infrastructure/persistence/roommate-profile.entity';
import { TypeOrmRoommateProfileRepository } from 'modules/roommate-profile/infrastructure/persistence/roommate-profile.repository';
import { RoommateProfileService } from 'modules/roommate-profile/application/roommate-profile.service';
import { TenantUserProjectionTypeormEntity } from 'modules/contract/infrastructure/persistence/tenant-user-projection.typeorm-entity';
import { TypeOrmTenantUserProjectionRepository } from 'modules/contract/infrastructure/persistence/tenant-user-projection.repository';
import { ContractTypeormEntity } from 'modules/contract/infrastructure/persistence/contract.entity';
import { ContractMemberTypeormEntity } from 'modules/contract/infrastructure/persistence/contract-member.entity';
import { RoomTypeormEntity } from 'modules/room/infrastructure/persistence/room.typeorm-entity';
import { BuildingTypeormEntity } from 'modules/building/infrastructure/persistence/building.typeorm-entity';
import { MatchRequestTypeormEntity } from 'modules/match-request/infrastructure/persistence/match-request.typeorm-entity';
import { TypeOrmMatchRequestRepository } from 'modules/match-request/infrastructure/persistence/match-request.repository';
import { MatchRequestService } from 'modules/match-request/application/match-request.service';
import { MatchRequestStatus } from 'modules/match-request/domain/enums/match-request-status.enum';
import { OutboxTypeormEntity } from 'modules/outbox/infrastructure/persistence/outbox.typeorm-entity';
import { TypeOrmOutboxRepository } from 'modules/outbox/infrastructure/persistence/outbox.repository';
import { TypeOrmUnitOfWork } from 'shared/infrastructure/database/transaction/typeorm-unit-of-work';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';
import { IdentityLifecycleSubscriber } from 'modules/contract/presentation/messaging/identity-lifecycle.subscriber';
import { TypeOrmContractRepository } from 'modules/contract/infrastructure/persistence/contract.repository';
import { TypeOrmContractMemberRepository } from 'modules/contract/infrastructure/persistence/contract-member.repository';
import { InboxTypeormEntity } from 'modules/inbox/infrastructure/persistence/inbox.typeorm-entity';
import { TypeOrmInboxRepository } from 'modules/inbox/infrastructure/persistence/inbox.repository';
import { IntegrationEvent } from 'shared/application/messaging/integration-event';
import { TenantPhone } from 'modules/contract/domain/value-objects/tenant-phone.vo';

jest.setTimeout(30000);
jest.mock('@golevelup/nestjs-rabbitmq', () => ({
  RabbitSubscribe: () => () => undefined,
}));
jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

describe('P13-08 matching on PostgreSQL', () => {
  let db: Awaited<ReturnType<typeof memoryPostgres>>;
  let profiles: TypeOrmRoommateProfileRepository;
  let projection: TypeOrmTenantUserProjectionRepository;
  let uow: TypeOrmUnitOfWork;
  let service: MatchRequestService;
  let browsing: RoommateProfileService;
  // Deliberately reports active even after projection removal: Identity cannot bypass it.
  const tenants = {
    findActive: async (ids: readonly string[]) =>
      new Map(
        ids.map((id) => [
          id.toLowerCase(),
          { id, name: 'Tenant', avatarUrl: null },
        ]),
      ),
    isLocked: async () => false,
  };
  beforeAll(async () => {
    db = await memoryPostgres([
      RoommateProfileEntity,
      TenantUserProjectionTypeormEntity,
      ContractTypeormEntity,
      ContractMemberTypeormEntity,
      RoomTypeormEntity,
      BuildingTypeormEntity,
      MatchRequestTypeormEntity,
      OutboxTypeormEntity,
      InboxTypeormEntity,
    ]);
    await db.source.synchronize(); // Disposable PGlite only, never .env.
    profiles = new TypeOrmRoommateProfileRepository(
      db.source.getRepository(RoommateProfileEntity),
    );
    projection = new TypeOrmTenantUserProjectionRepository(
      db.source.getRepository(TenantUserProjectionTypeormEntity),
    );
    uow = new TypeOrmUnitOfWork(db.source);
    const requests = new TypeOrmMatchRequestRepository(
      db.source.getRepository(MatchRequestTypeormEntity),
    );
    service = new MatchRequestService(
      requests,
      requests,
      profiles,
      tenants,
      uow,
      new TypeOrmOutboxRepository(db.source.getRepository(OutboxTypeormEntity)),
      projection,
    );
    browsing = new RoommateProfileService(profiles, profiles, tenants);
  });
  beforeEach(async () => {
    await db.postgres.exec(
      'TRUNCATE roommate_profiles, tenant_user_projections, match_requests, outbox_messages, contracts, contract_members, rooms, buildings CASCADE',
    );
  });
  afterAll(async () => {
    await db?.close();
  });
  async function tenant(phone: string, area = 'Da Nang') {
    const id = generateUuid();
    await uow.run((ctx) =>
      projection.upsert(id, TenantPhone.create(phone), ctx),
    );
    const profile = await db.source.getRepository(RoommateProfileEntity).save({
      tenantId: id,
      isVisible: true,
      bio: 'Hello',
      preferredArea: area,
    });
    return { id, profile, phone };
  }
  const outboxCount = () =>
    db.source.getRepository(OutboxTypeormEntity).count();

  it('filters before pagination/count, returns 404, retains visibility, and reappears on projection restore', async () => {
    const viewer = generateUuid();
    const a = await tenant('0912345678');
    await tenant('0922345678');
    await tenant('0932345678', 'Hue');
    await uow.run((ctx) => projection.delete(a.id, ctx));
    const page = await browsing.search(viewer, {
      pageNo: 1,
      pageSize: 1,
      preferredArea: 'Da Nang',
    });
    expect(page.data).toHaveLength(1);
    expect(page.data[0].tenantId).not.toBe(a.id);
    expect(page.pagination).toMatchObject({
      totalItems: 1,
      totalPages: 1,
      hasNextPage: false,
    });
    expect(
      (
        await browsing.search(viewer, {
          pageNo: 2,
          pageSize: 1,
          preferredArea: 'Da Nang',
        })
      ).data,
    ).toEqual([]);
    await expect(browsing.detail(viewer, a.profile.id)).rejects.toMatchObject({
      statusCode: 404,
    });
    expect((await profiles.findOwn(a.id))?.isVisible).toBe(true);
    await uow.run((ctx) =>
      projection.upsert(a.id, TenantPhone.create(a.phone), ctx),
    );
    expect(
      (
        await browsing.search(viewer, {
          pageNo: 1,
          pageSize: 1,
          preferredArea: 'Da Nang',
        })
      ).pagination.totalItems,
    ).toBe(2);
    expect((await browsing.detail(viewer, a.profile.id)).tenantId).toBe(a.id);
  });

  it('rolls back blocked creation, retains duplicate/self/idempotency rules and withdraw', async () => {
    const a = await tenant('0912345678'),
      b = await tenant('0922345678');
    await uow.run((ctx) => projection.delete(a.id, ctx));
    await expect(
      service.create(b.id, a.id, generateUuid()),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'MATCH_REQUEST_COUNTERPART_UNAVAILABLE',
    });
    expect(
      await db.source.getRepository(MatchRequestTypeormEntity).count(),
    ).toBe(0);
    expect(await outboxCount()).toBe(0);
    await uow.run((ctx) =>
      projection.upsert(a.id, TenantPhone.create(a.phone), ctx),
    );
    const key = generateUuid();
    const request = await service.create(b.id, a.id, key);
    await expect(
      service.create(a.id, b.id, generateUuid()),
    ).rejects.toMatchObject({ code: 'DUPLICATE_MATCH_REQUEST' });
    await expect(
      service.create(b.id, b.id, generateUuid()),
    ).rejects.toMatchObject({ code: 'SELF_MATCHING_NOT_ALLOWED' });
    await uow.run((ctx) => projection.delete(a.id, ctx));
    expect((await service.create(b.id, a.id, key)).id).toBe(request.id);
    await expect(
      service.create(b.id, generateUuid(), key),
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_KEY_REUSED' });
    expect(await outboxCount()).toBe(1);
    await service.transition(b.id, request.id, MatchRequestStatus.WITHDRAWN);
    expect(await outboxCount()).toBe(2);
  });

  it.each([MatchRequestStatus.ACCEPTED, MatchRequestStatus.REJECTED])(
    'blocks %s without save/outbox, then reuses the hidden/full request after unlock',
    async (next) => {
      const a = await tenant('0912345678'),
        b = await tenant('0922345678');
      const request = await service.create(a.id, b.id, generateUuid());
      const before = await db.source
        .getRepository(MatchRequestTypeormEntity)
        .findOneByOrFail({ id: request.id });
      await uow.run((ctx) => projection.delete(a.id, ctx));
      await expect(
        service.transition(a.id, request.id, next),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
      await expect(
        service.transition(b.id, request.id, next),
      ).rejects.toMatchObject({
        statusCode: 409,
        code: 'MATCH_REQUEST_COUNTERPART_UNAVAILABLE',
      });
      expect(
        await db.source
          .getRepository(MatchRequestTypeormEntity)
          .findOneByOrFail({ id: request.id }),
      ).toEqual(before);
      expect(await outboxCount()).toBe(1);
      await uow.run((ctx) =>
        projection.upsert(a.id, TenantPhone.create(a.phone), ctx),
      );
      // Recipient hides their profile, and their active room becomes full after creation.
      const buildingId = generateUuid(),
        roomId = generateUuid(),
        landlordId = generateUuid();
      await db.postgres.query(
        `INSERT INTO buildings (id,landlord_id,name,address,ward,province,latitude,longitude,status) VALUES ($1,$2,'Building','Street','Ward','Province',16,108,'approved')`,
        [buildingId, landlordId],
      );
      await db.postgres.query(
        `INSERT INTO rooms (id,landlord_id,building_id,name,rent_price,deposit_amount,max_occupancy) VALUES ($1,$2,$3,'101',100,0,1)`,
        [roomId, landlordId, buildingId],
      );
      await db.postgres.query(
        `INSERT INTO contracts (landlord_id,room_id,tenant_id,status,deposit_amount,rent_price,start_date,end_date) VALUES ($1,$2,$3,'active',0,100,'2026-01-01','2027-01-01')`,
        [landlordId, roomId, b.id],
      );
      expect(await profiles.findDiscoverable(b.profile.id)).toBeNull(); // full room alone
      await db.source
        .getRepository(RoommateProfileEntity)
        .update({ tenantId: b.id }, { isVisible: false });
      expect((await service.transition(b.id, request.id, next)).status).toBe(
        next,
      );
      expect(await outboxCount()).toBe(2);
      await uow.run((ctx) => projection.delete(a.id, ctx));
      expect((await service.transition(b.id, request.id, next)).status).toBe(
        next,
      );
      const other =
        next === MatchRequestStatus.ACCEPTED
          ? MatchRequestStatus.REJECTED
          : MatchRequestStatus.ACCEPTED;
      await expect(
        service.transition(b.id, request.id, other),
      ).rejects.toMatchObject({ code: 'MATCH_REQUEST_NOT_PENDING' });
      expect(await outboxCount()).toBe(2);
    },
  );
  it('processes actual lock/unlock events and restores the same pending invitation without repair', async () => {
    const a = await tenant('0912345678');
    const b = await tenant('0922345678');
    const c = await tenant('0932345678');
    const request = await service.create(a.id, b.id, generateUuid());
    const stored = db.source.getRepository(MatchRequestTypeormEntity);
    const before = await stored.findOneByOrFail({ id: request.id });
    const consumer = new IdentityLifecycleSubscriber(
      projection,
      new TypeOrmContractRepository(
        db.source.getRepository(ContractTypeormEntity),
      ),
      new TypeOrmContractMemberRepository(
        db.source.getRepository(ContractMemberTypeormEntity),
      ),
      new TypeOrmOutboxRepository(db.source.getRepository(OutboxTypeormEntity)),
      new TypeOrmInboxRepository(db.source.getRepository(InboxTypeormEntity)),
      uow,
    );
    const event = (locked: boolean): IntegrationEvent => ({
      id: generateUuid(),
      aggregateId: a.id,
      aggregateType: 'User',
      eventType: locked ? 'user.locked' : 'user.unlocked',
      routingKey: locked ? 'user.locked' : 'user.unlocked',
      occurredAt: '2026-11-28T00:00:00.000Z',
      payload: {
        userId: a.id,
        role: 'tenant',
        status: locked ? 'locked' : 'active',
        phone: a.phone,
        lockedAt: '2026-11-28T00:00:00.000Z',
      },
    });
    const lock = event(true);
    await consumer.handle(lock);
    await consumer.handle(lock); // Redelivery must preserve the same pending request too.
    expect(await stored.findOneByOrFail({ id: request.id })).toEqual(before);
    expect(await outboxCount()).toBe(1);
    expect(
      (await browsing.search(b.id, { pageNo: 1, pageSize: 20 })).data.map(
        (p) => p.tenantId,
      ),
    ).not.toContain(a.id);
    await expect(browsing.detail(b.id, a.profile.id)).rejects.toMatchObject({
      statusCode: 404,
    });
    await expect(
      service.create(c.id, a.id, generateUuid()),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'MATCH_REQUEST_COUNTERPART_UNAVAILABLE',
    });
    for (const next of [
      MatchRequestStatus.ACCEPTED,
      MatchRequestStatus.REJECTED,
    ]) {
      await expect(
        service.transition(b.id, request.id, next),
      ).rejects.toMatchObject({
        statusCode: 409,
        code: 'MATCH_REQUEST_COUNTERPART_UNAVAILABLE',
      });
    }
    expect(await stored.findOneByOrFail({ id: request.id })).toEqual(before);
    expect(await outboxCount()).toBe(1);
    expect((await profiles.findOwn(a.id))?.isVisible).toBe(true);
    const unlock = event(false);
    await consumer.handle(unlock);
    await consumer.handle(unlock);
    expect(
      (await browsing.search(b.id, { pageNo: 1, pageSize: 20 })).data.map(
        (p) => p.tenantId,
      ),
    ).toContain(a.id);
    expect((await browsing.detail(b.id, a.profile.id)).tenantId).toBe(a.id);
    expect(await stored.findOneByOrFail({ id: request.id })).toEqual(before);
    expect((await profiles.findOwn(a.id))?.isVisible).toBe(true);
    expect(
      (await service.transition(b.id, request.id, MatchRequestStatus.ACCEPTED))
        .status,
    ).toBe(MatchRequestStatus.ACCEPTED);
    expect(await outboxCount()).toBe(2);
  });
});
