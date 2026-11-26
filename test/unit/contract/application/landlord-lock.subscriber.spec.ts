import { RoomRepository } from 'modules/room/domain/repositories/room.repository';
import { ContractNotificationSnapshotService } from 'modules/contract/application/services/contract-notification-snapshot.service';
import { ContractNotificationCodeConstant } from 'modules/contract/domain/constants/contract-notification-code.constant';
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
    findByIdsForUpdate: jest.fn(async () => [first, second]),
    findForLandlordLockForUpdate: jest.fn(async () => [first, second]),
    save: jest.fn(async () => undefined),
  };
  const members = {
    findActiveByContract: jest.fn(async (id: Uuid) =>
      id === first.id ? [member, createMember(first.id, first.tenantId)] : [],
    ),
  };
  const inbox = { recordIfNew: jest.fn(async () => true) };
  const rooms = {
    findById: jest.fn(async (id: Uuid) => ({ name: `Room ${id}` })),
  };
  const subscriber = new IdentityLifecycleSubscriber(
    deps.projection,
    contracts as unknown as ContractRepository,
    members as unknown as ContractMemberRepository,
    deps.outbox as unknown as OutboxRepository,
    inbox as unknown as InboxRepository,
    deps.unitOfWork,
    cycles as unknown as LandlordLockCycleRepository,
    GRACE_MS,
    new ContractNotificationSnapshotService(rooms as unknown as RoomRepository),
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
    rooms,
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
  it('sends a grouped decision request only to the landlord and preserves replay guards', async () => {
    const s = setup();
    const lock = s.lockEvent();
    await s.subscriber.handle(lock);
    s.outbox.append.mockClear();
    const foreign = createContract(generateUuid());
    foreign.suspend();
    const active = createContract(generateUuid(), s.landlordId);
    s.contracts.findByIdsForUpdate.mockResolvedValue([
      s.first,
      s.second,
      foreign,
      active,
    ]);
    const unlock: IntegrationEvent = {
      ...lock,
      id: generateUuid(),
      eventType: 'user.unlocked',
      routingKey: 'user.unlocked',
      occurredAt: new Date(LOCKED_AT.getTime() + 1).toISOString(),
      payload: { ...lock.payload, status: UserStatus.ACTIVE },
    };
    await s.subscriber.handle(unlock);
    // A new envelope for the same unlock must also remain a no-op.
    await s.subscriber.handle({ ...unlock, id: generateUuid() });
    s.inbox.recordIfNew.mockResolvedValueOnce(false);
    await s.subscriber.handle(unlock);
    expect(s.outbox.append).toHaveBeenCalledTimes(1);
    const [messages, context] = s.outbox.append.mock.calls[0];
    expect(context).toBe(s.context);
    expect(messages).toHaveLength(1);
    expect(messages[0].payload).toEqual({
      sourceService: 'tenancy',
      recipientUserIds: [s.landlordId],
      notification: {
        type: 'system',
        title:
          ContractNotificationCodeConstant.CONTRACT_LOCK_DECISION_REQUIRED_TITLE,
        body: ContractNotificationCodeConstant.CONTRACT_LOCK_DECISION_REQUIRED_BODY,
        data: {
          messageKey: 'contract.lock_decision_required',
          landlordId: s.landlordId,
          lockCycleId: lock.id,
          contractIds: [s.first.id, s.second.id],
          contracts: [s.first, s.second].map((contract) => ({
            contractId: contract.id,
            contractCode: `HD-${contract.id.slice(0, 6)}`,
            roomName: `Room ${contract.roomId}`,
          })),
          graceDeadline: new Date(LOCKED_AT.getTime() + GRACE_MS).toISOString(),
          action: 'decision_required',
        },
      },
    });
    expect(s.cycles.save).toHaveBeenLastCalledWith(
      s.snapshots.get(lock.id),
      s.context,
    );
  });

  it('keeps multiple contracts for a shared member in one private notification', async () => {
    const s = setup();
    s.members.findActiveByContract.mockImplementation(async (id: Uuid) => [
      createMember(id, s.member.tenantId),
      createMember(id, s.member.tenantId),
      createMember(id),
    ]);
    await s.subscriber.handle(s.lockEvent());
    const [messages] = s.outbox.append.mock.calls[0];
    const forMember = messages.filter((message) =>
      (message.payload.recipientUserIds as Uuid[]).includes(s.member.tenantId!),
    );
    expect(forMember).toHaveLength(1);
    expect(forMember[0].payload.notification).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          contractIds: [s.first.id, s.second.id],
          contracts: [s.first, s.second].map((contract) => ({
            contractId: contract.id,
            contractCode: `HD-${contract.id.slice(0, 6)}`,
            roomName: `Room ${contract.roomId}`,
          })),
        }),
      }),
    );
  });

  it('does not append another notification after inbox rejects a repeated lock', async () => {
    const s = setup();
    const event = s.lockEvent();
    await s.subscriber.handle(event);
    s.inbox.recordIfNew.mockResolvedValueOnce(false);
    await s.subscriber.handle(event);
    expect(s.outbox.append).toHaveBeenCalledTimes(1);
    expect(s.rooms.findById).toHaveBeenCalledTimes(2);
  });

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
    const [messages, context] = s.outbox.append.mock.calls[0];
    expect(context).toBe(s.context);
    expect(messages).toHaveLength(4);
    expect(messages.map((message) => message.payload.recipientUserIds)).toEqual(
      [
        [s.landlordId],
        [s.first.tenantId],
        [s.member.tenantId],
        [s.second.tenantId],
      ],
    );
    const expectedContracts = new Map([
      [s.landlordId, [s.first, s.second]],
      [s.first.tenantId, [s.first]],
      [s.member.tenantId, [s.first]],
      [s.second.tenantId, [s.second]],
    ]);
    for (const message of messages) {
      const recipient = (message.payload.recipientUserIds as Uuid[])[0];
      const contracts = expectedContracts.get(recipient)!;
      expect(message.eventType).toBe('notification.requested');
      expect(message.routingKey).toBe('notification.requested');
      expect(message.payload).toEqual({
        sourceService: 'tenancy',
        recipientUserIds: [recipient],
        notification: {
          type: 'system',
          title: ContractNotificationCodeConstant.CONTRACT_SUSPENDED_TITLE,
          body: ContractNotificationCodeConstant.CONTRACT_SUSPENDED_BODY,
          data: {
            messageKey: 'contract.suspended',
            landlordId: s.landlordId,
            lockCycleId: id,
            contractIds: contracts.map((contract) => contract.id),
            contracts: contracts.map((contract) => ({
              contractId: contract.id,
              contractCode: `HD-${contract.id.slice(0, 6)}`,
              roomName: `Room ${contract.roomId}`,
            })),
            graceDeadline: new Date(
              LOCKED_AT.getTime() + GRACE_MS,
            ).toISOString(),
          },
        },
      });
    }
    expect(s.contracts.save).toHaveBeenCalledWith(s.second, s.context);
    expect(s.rooms.findById).toHaveBeenCalledWith(s.first.roomId, s.context);
    expect(s.rooms.findById).toHaveBeenCalledWith(s.second.roomId, s.context);
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
