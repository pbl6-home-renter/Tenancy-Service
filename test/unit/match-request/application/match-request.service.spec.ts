import { MatchRequestService } from 'modules/match-request/application/match-request.service';
import { MatchRequestEntity } from 'modules/match-request/domain/entities/match-request.entity';
import { MatchRequestStatus } from 'modules/match-request/domain/enums/match-request-status.enum';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';

describe('match request service', () => {
  const requesterId = generateUuid();
  const targetId = generateUuid();
  const profile = { id: generateUuid(), tenantId: targetId, isVisible: true };
  const requests = {
    findByRequestKey: jest.fn(),
    insertOrFind: jest.fn(),
    findByIdForUpdate: jest.fn(),
    save: jest.fn(),
  };
  const pages = { findPage: jest.fn() };
  const profiles = { findDiscoverableByTenantId: jest.fn() };
  const tenants = {
    findActive: jest.fn(
      async (ids: string[]) =>
        new Map(
          ids.map((id) => [
            id.toLowerCase(),
            { id, name: 'Tenant', avatarUrl: null },
          ]),
        ),
    ),
  };
  const unitOfWork = {
    run: jest.fn(
      async (work: (context: { kind: 'transaction' }) => Promise<unknown>) =>
        work({ kind: 'transaction' }),
    ),
  };
  const outbox = { append: jest.fn() };
  const service = new MatchRequestService(
    requests as never,
    pages as never,
    profiles as never,
    tenants as never,
    unitOfWork as never,
    outbox as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    requests.findByRequestKey.mockResolvedValue(null);
    profiles.findDiscoverableByTenantId.mockResolvedValue(profile);
    requests.insertOrFind.mockImplementation(
      async (request: MatchRequestEntity) => ({ request, created: true }),
    );
  });

  it('creates once, emits to the target, and replays the same key without another notification', async () => {
    const key = generateUuid();
    const created = await service.create(requesterId, targetId, key);
    expect(created.status).toBe(MatchRequestStatus.PENDING);
    expect(outbox.append).toHaveBeenCalledTimes(1);
    expect(outbox.append.mock.calls[0][0][0].payload).toMatchObject({
      recipientUserId: targetId,
      actorUserId: requesterId,
      actorDisplayName: 'Tenant',
    });

    requests.findByRequestKey.mockResolvedValue(
      MatchRequestEntity.reconstitute({
        id: created.id,
        requesterId,
        targetId,
        idempotencyKey: key,
        status: MatchRequestStatus.ACCEPTED,
      }),
    );
    const replay = await service.create(requesterId, targetId, key);
    expect(replay.id).toBe(created.id);
    expect(replay.status).toBe(MatchRequestStatus.ACCEPTED);
    expect(outbox.append).toHaveBeenCalledTimes(1);
    expect(requests.insertOrFind).toHaveBeenCalledTimes(1);
  });

  it('rejects a hidden target inside the transaction and never emits', async () => {
    profiles.findDiscoverableByTenantId.mockResolvedValueOnce(null);
    await expect(
      service.create(requesterId, targetId, generateUuid()),
    ).rejects.toMatchObject({
      code: 'ROOMMATE_PROFILE_NOT_FOUND',
    });
    expect(requests.insertOrFind).toHaveBeenCalledTimes(1);
    expect(outbox.append).not.toHaveBeenCalled();
  });

  it('returns a concurrent same-key creation before rechecking profile visibility', async () => {
    const key = generateUuid();
    const existing = MatchRequestEntity.reconstitute({
      id: generateUuid(),
      requesterId,
      targetId,
      idempotencyKey: key,
      status: MatchRequestStatus.PENDING,
    });
    requests.insertOrFind.mockResolvedValueOnce({
      request: existing,
      created: false,
    });
    profiles.findDiscoverableByTenantId.mockResolvedValueOnce(null);
    const replay = await service.create(requesterId, targetId, key);
    expect(replay.id).toBe(existing.id);
    expect(profiles.findDiscoverableByTenantId).not.toHaveBeenCalled();
    expect(outbox.append).not.toHaveBeenCalled();
  });

  it('fails closed when the requester or target account is inactive', async () => {
    tenants.findActive.mockResolvedValueOnce(new Map());
    await expect(
      service.create(requesterId, targetId, generateUuid()),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(requests.findByRequestKey).not.toHaveBeenCalled();

    tenants.findActive
      .mockResolvedValueOnce(
        new Map([
          [
            requesterId.toLowerCase(),
            {
              id: requesterId,
              name: 'Tenant',
              avatarUrl: null,
            },
          ],
        ]),
      )
      .mockResolvedValueOnce(new Map());
    await expect(
      service.create(requesterId, targetId, generateUuid()),
    ).rejects.toMatchObject({ code: 'ROOMMATE_PROFILE_NOT_FOUND' });
    expect(requests.insertOrFind).toHaveBeenCalledTimes(1);
    expect(outbox.append).not.toHaveBeenCalled();
  });

  it('includes requester and target summaries in the paginated list', async () => {
    const request = MatchRequestEntity.create(
      requesterId,
      targetId,
      generateUuid(),
    );
    const pagination = {
      type: 'offset' as const,
      pageNo: 1,
      pageSize: 20,
      totalItems: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    };
    pages.findPage.mockResolvedValueOnce({ data: [request], pagination });

    const result = await service.list(requesterId, {
      pageNo: 1,
      pageSize: 20,
    });

    expect(result).toEqual({
      data: [
        {
          request,
          requester: { id: requesterId, name: 'Tenant', avatarUrl: null },
          target: { id: targetId, name: 'Tenant', avatarUrl: null },
        },
      ],
      pagination,
    });
    expect(tenants.findActive).toHaveBeenNthCalledWith(1, [requesterId]);
    expect(tenants.findActive).toHaveBeenNthCalledWith(2, [targetId]);
  });

  it('fails explicitly when a match request participant is no longer active', async () => {
    const request = MatchRequestEntity.create(
      requesterId,
      targetId,
      generateUuid(),
    );
    pages.findPage.mockResolvedValueOnce({
      data: [request],
      pagination: {
        type: 'offset',
        pageNo: 1,
        pageSize: 20,
        totalItems: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });
    tenants.findActive
      .mockResolvedValueOnce(
        new Map([
          [
            requesterId.toLowerCase(),
            { id: requesterId, name: 'Tenant', avatarUrl: null },
          ],
        ]),
      )
      .mockResolvedValueOnce(new Map());

    await expect(
      service.list(requesterId, { pageNo: 1, pageSize: 20 }),
    ).rejects.toMatchObject({
      code: 'MATCH_REQUEST_PARTICIPANT_UNAVAILABLE',
    });
  });

  it('rejects reuse of an idempotency key for a different target', async () => {
    const key = generateUuid();
    requests.findByRequestKey.mockResolvedValue(
      MatchRequestEntity.create(requesterId, generateUuid(), key),
    );
    await expect(
      service.create(requesterId, targetId, key),
    ).rejects.toMatchObject({
      code: 'IDEMPOTENCY_KEY_REUSED',
    });
    expect(requests.insertOrFind).not.toHaveBeenCalled();
  });

  it('persists and emits only on the first transition', async () => {
    const request = MatchRequestEntity.create(
      requesterId,
      targetId,
      generateUuid(),
    );
    request.pullDomainEvents();
    requests.findByIdForUpdate.mockResolvedValue(request);
    await service.transition(targetId, request.id, MatchRequestStatus.REJECTED);
    await service.transition(targetId, request.id, MatchRequestStatus.REJECTED);
    expect(requests.save).toHaveBeenCalledTimes(1);
    expect(outbox.append).toHaveBeenCalledTimes(1);
    expect(outbox.append.mock.calls[0][0][0].payload).toMatchObject({
      recipientUserId: requesterId,
      actorUserId: targetId,
      actorDisplayName: 'Tenant',
    });
  });
});
