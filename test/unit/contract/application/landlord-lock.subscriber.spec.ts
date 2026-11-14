import { IdentityLifecycleSubscriber } from 'modules/contract/presentation/messaging/identity-lifecycle.subscriber';
import { IntegrationEvent } from 'shared/application/messaging/integration-event';
import { InboxRepository } from 'modules/inbox/application/ports/inbox.repository';
import { UserRole } from 'shared/domain/enums/user-role.enum';
import { UserStatus } from 'shared/domain/enums/user-status.enum';
import { LandlordLockCycleRepository } from 'modules/contract/domain/repositories/landlord-lock-cycle.repository';
import { LandlordLockCycleEntity } from 'modules/contract/domain/entities/landlord-lock-cycle.entity';
import { ContractStatus } from 'modules/contract/domain/enums/contract-status.enum';
import { ContractRepository } from 'modules/contract/domain/repositories/contract.repository';
import { ContractMemberRepository } from 'modules/contract/domain/repositories/contract-member.repository';
import { OutboxRepository } from 'modules/outbox/domain/repositories/outbox.repository';
import { generateUuid, Uuid } from 'shared/domain/value-objects/uuid.vo';
import {
  createContract,
  createMember,
  createLinkDependencies,
} from '../support/contract-link.fixture';

jest.mock('@golevelup/nestjs-rabbitmq', () => ({
  RabbitSubscribe: () => () => undefined,
}));

const LOCKED_AT = new Date('2026-11-14T00:00:00.000Z');
const GRACE_MS = 60_000;

function setup() {
  const deps = createLinkDependencies();
  const first = createContract(generateUuid());
  const second = createContract(generateUuid(), first.landlordId);
  const landlordId = first.landlordId;
  const member = createMember(first.id, generateUuid());
  const snapshots = new Map<Uuid, LandlordLockCycleEntity>();
  const cycles = {
    lockLandlord: jest.fn(async () => undefined),
    findLatestForUpdate: jest.fn(
      async () =>
        [...snapshots.values()].sort(
          (a, b) => b.lockedAt.getTime() - a.lockedAt.getTime(),
        )[0] ?? null,
    ),
    save: jest.fn(async (cycle: LandlordLockCycleEntity) => {
      snapshots.set(cycle.id, cycle);
    }),
  };
  const contracts = {
    findForLandlordLockForUpdate: jest.fn(async () => [first, second]),
    save: jest.fn(async () => undefined),
  };
  const members = {
    findActiveByContract: jest.fn(async (id: Uuid) =>
      id === first.id ? [member, createMember(first.id, first.tenantId)] : [],
    ),
  };
  const inbox = { recordIfNew: jest.fn(async () => true) };
  const subscriber = new IdentityLifecycleSubscriber(
    deps.projection,
    contracts as unknown as ContractRepository,
    members as unknown as ContractMemberRepository,
    deps.outbox as unknown as OutboxRepository,
    inbox as unknown as InboxRepository,
    deps.unitOfWork,
    cycles as unknown as LandlordLockCycleRepository,
    GRACE_MS,
  );
  function lockEvent(
    id = generateUuid(),
    lockedAt = LOCKED_AT,
  ): IntegrationEvent {
    return {
      id,
      eventType: 'user.locked',
      routingKey: 'user.locked',
      aggregateType: 'User',
      aggregateId: landlordId,
      occurredAt: lockedAt.toISOString(),
      payload: {
        userId: landlordId,
        role: UserRole.LANDLORD,
        status: UserStatus.LOCKED,
        lockedAt: lockedAt.toISOString(),
      },
    };
  }
  return {
    ...deps,
    first,
    second,
    member,
    landlordId,
    cycles,
    snapshots,
    contracts,
    members,
    inbox,
    subscriber,
    lockEvent,
  };
}

describe('Landlord lock choreography (P9-06)', () => {
  it('suspends contracts and saves cycle and private recipient snapshots in the inbox transaction', async () => {
    const s = setup();
    const id = generateUuid();
    await s.subscriber.handle(s.lockEvent(id));

    expect(s.first.status).toBe(ContractStatus.SUSPENDED);
    expect(s.second.status).toBe(ContractStatus.SUSPENDED);
    expect(s.cycles.lockLandlord).toHaveBeenCalledWith(s.landlordId, s.context);
    expect(s.contracts.findForLandlordLockForUpdate).toHaveBeenCalledWith(
      s.landlordId,
      [],
      s.context,
    );
    expect(s.contracts.save).toHaveBeenCalledWith(s.first, s.context);
    expect(s.cycles.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id,
        contractIds: [s.first.id, s.second.id],
        graceDeadline: new Date(LOCKED_AT.getTime() + GRACE_MS),
      }),
      s.context,
    );
    const messages = s.outbox.append.mock.calls[0] as unknown as [
      {
        payload: {
          recipientUserIds: Uuid[];
          notification: { type: string; data: { contractIds: Uuid[] } };
        };
      }[],
      unknown,
    ];
    expect(messages[1]).toBe(s.context);
    const recipients = messages[0].map((message) => ({
      userId: message.payload.recipientUserIds[0],
      contractIds: message.payload.notification.data.contractIds,
    }));
    expect(recipients).toEqual(
      expect.arrayContaining([
        { userId: s.landlordId, contractIds: [s.first.id, s.second.id] },
        { userId: s.first.tenantId, contractIds: [s.first.id] },
        { userId: s.member.tenantId, contractIds: [s.first.id] },
        { userId: s.second.tenantId, contractIds: [s.second.id] },
      ]),
    );
    expect(recipients).toHaveLength(4);
    expect(
      messages[0].every(
        (message) => message.payload.notification.type === 'system',
      ),
    ).toBe(true);
  });

  it('does not duplicate cycles or notices for another envelope of the same or older lock', async () => {
    const s = setup();
    await s.subscriber.handle(s.lockEvent());
    await s.subscriber.handle(s.lockEvent());
    await s.subscriber.handle(
      s.lockEvent(generateUuid(), new Date(LOCKED_AT.getTime() - 1)),
    );
    expect(s.snapshots.size).toBe(1);
    expect(s.outbox.append).toHaveBeenCalledTimes(1);
    expect(s.contracts.findForLandlordLockForUpdate).toHaveBeenCalledTimes(1);
  });

  it('carries unresolved suspensions into the next cycle without repeating suspension notices', async () => {
    const s = setup();
    const previousId = generateUuid();
    const id = generateUuid();
    await s.subscriber.handle(s.lockEvent(previousId));
    await s.subscriber.handle(
      s.lockEvent(id, new Date(LOCKED_AT.getTime() + 1)),
    );
    expect(s.snapshots.get(previousId)?.state).toBe('superseded');
    expect(s.snapshots.get(id)?.contractIds).toEqual([s.first.id, s.second.id]);
    expect(s.contracts.findForLandlordLockForUpdate).toHaveBeenLastCalledWith(
      s.landlordId,
      [s.first.id, s.second.id],
      s.context,
    );
    expect(s.contracts.save).toHaveBeenCalledTimes(2);
    expect(s.outbox.append).toHaveBeenLastCalledWith([], s.context);
  });

  it('persists a cycle even when the landlord has no active contracts', async () => {
    const s = setup();
    s.contracts.findForLandlordLockForUpdate.mockResolvedValue([]);
    const id = generateUuid();
    await s.subscriber.handle(s.lockEvent(id));
    expect(s.snapshots.get(id)?.contractIds).toEqual([]);
    expect(s.snapshots.get(id)?.state).toBe('pending');
    expect(s.outbox.append).toHaveBeenCalledWith([], s.context);
  });

  it('propagates outbox failure so the surrounding inbox transaction rolls back', async () => {
    const s = setup();
    const error = new Error('outbox unavailable');
    s.outbox.append.mockRejectedValue(error);
    await expect(s.subscriber.handle(s.lockEvent())).rejects.toBe(error);
  });
});
