import { IdentityLifecycleSubscriber } from 'modules/contract/presentation/messaging/identity-lifecycle.subscriber';
import { IntegrationEvent } from 'shared/application/messaging/integration-event';
import { UserRole } from 'shared/domain/enums/user-role.enum';
import { UserStatus } from 'shared/domain/enums/user-status.enum';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';
import { InboxRepository } from 'modules/inbox/application/ports/inbox.repository';
import { OutboxRepository } from 'modules/outbox/domain/repositories/outbox.repository';
import { ContractRepository } from 'modules/contract/domain/repositories/contract.repository';
import { ContractMemberRepository } from 'modules/contract/domain/repositories/contract-member.repository';
import { ContractMember } from 'modules/contract/domain/entities/contract-member.entity';
import {
  createContract,
  createMember,
  createLinkDependencies,
} from '../../support/contract-link.fixture';

jest.mock('@golevelup/nestjs-rabbitmq', () => ({
  RabbitSubscribe: () => () => undefined,
}));

function setup() {
  const deps = createLinkDependencies();
  const contracts = {
    findUnlinkedByPhoneForUpdate: jest.fn(async () => [contract]),
    linkTenantMany: jest.fn(async () => undefined),
  };
  const contract = createContract();
  const member = createMember(contract.id);
  const members = {
    findUnlinkedByPhoneForUpdate: jest.fn<Promise<ContractMember[]>, unknown[]>(
      async () => [member],
    ),
    linkTenantMany: jest.fn(async () => undefined),
  };
  const inbox = { recordIfNew: jest.fn(async () => true) };
  const handler = new IdentityLifecycleSubscriber(
    deps.projection,
    contracts as unknown as ContractRepository,
    members as unknown as ContractMemberRepository,
    deps.outbox as unknown as OutboxRepository,
    inbox as unknown as InboxRepository,
    deps.unitOfWork,
  );
  const userId = generateUuid();
  function event(
    eventType = 'user.registered',
    payload: Record<string, unknown> = {},
  ): IntegrationEvent {
    return {
      id: generateUuid(),
      eventType,
      routingKey: eventType,
      aggregateType: 'user',
      aggregateId: userId,
      occurredAt: '2026-01-01T00:00:00.000Z',
      payload: {
        userId,
        phone: '+84912345678',
        role: UserRole.TENANT,
        status: UserStatus.ACTIVE,
        ...payload,
      },
    };
  }
  return {
    ...deps,
    contracts,
    contract,
    members,
    member,
    inbox,
    handler,
    userId,
    event,
  };
}

describe('IdentityLifecycleSubscriber tenant projection and linking (P9-02)', () => {
  it.each(['user.registered', 'user.updated', 'user.email_verified'])(
    'updates the projection and reconciles unlinked members on %s in one transaction',
    async (eventType) => {
      const s = setup();
      const event = s.event(eventType);
      await s.handler.handle(event);
      expect(s.inbox.recordIfNew).toHaveBeenCalledWith(
        event.id,
        eventType,
        s.context,
      );
      expect(s.projection.upsert).toHaveBeenCalledWith(
        s.userId,
        expect.objectContaining({ normalizedValue: '0912345678' }),
        s.context,
      );
      expect(s.projection.lockPhone).toHaveBeenCalledWith(
        expect.objectContaining({ normalizedValue: '0912345678' }),
        s.context,
      );
      expect(s.contracts.findUnlinkedByPhoneForUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ normalizedValue: '0912345678' }),
        s.context,
      );
      expect(s.members.findUnlinkedByPhoneForUpdate).toHaveBeenCalledWith(
        [s.contract.id],
        expect.objectContaining({ normalizedValue: '0912345678' }),
        s.context,
      );
      expect(s.contract.tenantId).toBe(s.userId);
      expect(s.member.tenantId).toBe(s.userId);
      expect(s.contracts.linkTenantMany).toHaveBeenCalledWith(
        [s.contract.id],
        s.userId,
        s.context,
      );
      expect(s.members.linkTenantMany).toHaveBeenCalledWith(
        [s.member.id],
        s.userId,
        s.context,
      );
      expect(s.outbox.append).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            eventType: 'contract_member.linked',
            payload: {
              contractId: s.contract.id,
              contractMemberId: s.member.id,
              tenantUserId: s.userId,
              joinedAt: '2026-01-01',
            },
          }),
        ],
        s.context,
      );
    },
  );

  it('does not transfer historical links to another account with the same phone', async () => {
    const s = setup();
    const historicalTenantId = generateUuid();
    const historicalMember = createMember(s.contract.id, historicalTenantId);
    s.members.findUnlinkedByPhoneForUpdate.mockResolvedValue([
      historicalMember,
    ]);
    await s.handler.handle(s.event('user.updated'));
    expect(s.projection.upsert).toHaveBeenCalledWith(
      s.userId,
      expect.anything(),
      s.context,
    );
    expect(historicalMember.tenantId).toBe(historicalTenantId);
    expect(s.members.linkTenantMany).toHaveBeenCalledWith(
      [],
      s.userId,
      s.context,
    );
    expect(s.outbox.append).toHaveBeenCalledWith([], s.context);
  });

  it('updates the projection to the new normalized phone on user.updated', async () => {
    const s = setup();
    s.contracts.findUnlinkedByPhoneForUpdate.mockResolvedValue([]);
    await s.handler.handle(s.event('user.updated', { phone: '+84987654321' }));
    expect(s.projection.upsert).toHaveBeenCalledWith(
      s.userId,
      expect.objectContaining({ normalizedValue: '0987654321' }),
      s.context,
    );
    expect(s.projection.delete).not.toHaveBeenCalled();
  });

  it('deletes only the lookup mapping on user.deleted, accepting a payload with just userId', async () => {
    const s = setup();
    const historicalMember = createMember(s.contract.id, s.userId);
    s.members.findUnlinkedByPhoneForUpdate.mockResolvedValue([
      historicalMember,
    ]);
    await s.handler.handle({
      ...s.event('user.deleted'),
      payload: { userId: s.userId },
    });
    expect(s.projection.delete).toHaveBeenCalledWith(s.userId, s.context);
    expect(s.projection.upsert).not.toHaveBeenCalled();
    expect(s.contracts.findUnlinkedByPhoneForUpdate).not.toHaveBeenCalled();
    expect(s.members.linkTenantMany).not.toHaveBeenCalled();
    expect(s.outbox.append).not.toHaveBeenCalled();
    expect(historicalMember.tenantId).toBe(s.userId);
  });

  it('does not process a redelivered event after inbox deduplication', async () => {
    const s = setup();
    const event = s.event();
    s.inbox.recordIfNew
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    await s.handler.handle(event);
    await s.handler.handle(event);
    expect(s.projection.upsert).toHaveBeenCalledTimes(1);
    expect(s.members.linkTenantMany).toHaveBeenCalledTimes(1);
    expect(s.outbox.append).toHaveBeenCalledTimes(1);
  });

  it('stores a tenant projection even when no matching contracts exist yet', async () => {
    const s = setup();
    s.contracts.findUnlinkedByPhoneForUpdate.mockResolvedValue([]);
    await s.handler.handle(s.event());
    expect(s.projection.upsert).toHaveBeenCalledWith(
      s.userId,
      expect.anything(),
      s.context,
    );
    expect(s.members.findUnlinkedByPhoneForUpdate).not.toHaveBeenCalled();
    expect(s.outbox.append).not.toHaveBeenCalled();
  });

  it.each([
    { role: UserRole.LANDLORD, status: UserStatus.ACTIVE },
    { role: UserRole.TENANT, status: UserStatus.PENDING_VERIFICATION },
    { role: UserRole.TENANT, status: UserStatus.LOCKED },
  ])('does not link an ineligible account: %j', async (payload) => {
    const s = setup();
    await s.handler.handle(s.event('user.updated', payload));
    expect(s.projection.delete).toHaveBeenCalledWith(s.userId, s.context);
    expect(s.projection.upsert).not.toHaveBeenCalled();
    expect(s.members.linkTenantMany).not.toHaveBeenCalled();
  });

  it.each([
    { eventType: 'unknown' },
    { routingKey: 'user.deleted' },
    { payload: { userId: 'invalid' } },
    {
      payload: {
        userId: generateUuid(),
        phone: '0912345678',
        role: 'invalid',
        status: 'active',
      },
    },
    {
      payload: {
        userId: generateUuid(),
        phone: '0912345678',
        role: 'tenant',
        status: 'invalid',
      },
    },
  ])(
    'rejects malformed events before recording an inbox entry: %j',
    async (patch) => {
      const s = setup();
      await expect(
        s.handler.handle({ ...s.event(), ...patch }),
      ).rejects.toThrow(ValidationException);
      expect(s.inbox.recordIfNew).not.toHaveBeenCalled();
      expect(s.projection.upsert).not.toHaveBeenCalled();
    },
  );

  it('rejects an invalid phone before storing a projection', async () => {
    const s = setup();
    await expect(
      s.handler.handle(s.event('user.updated', { phone: '123' })),
    ).rejects.toThrow(ValidationException);
    expect(s.projection.upsert).not.toHaveBeenCalled();
    expect(s.members.linkTenantMany).not.toHaveBeenCalled();
  });

  it('propagates an outbox error for transaction rollback and broker retry', async () => {
    const s = setup();
    const failure = new Error('outbox unavailable');
    s.outbox.append.mockRejectedValue(failure);
    await expect(s.handler.handle(s.event())).rejects.toBe(failure);
    expect(s.members.linkTenantMany).toHaveBeenCalledWith(
      [s.member.id],
      s.userId,
      s.context,
    );
    expect(s.outbox.append).toHaveBeenCalledWith(expect.anything(), s.context);
  });
});
