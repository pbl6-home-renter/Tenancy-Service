import { RoomRepository } from 'modules/room/domain/repositories/room.repository';
import { ContractNotificationSnapshotService } from 'modules/contract/application/services/contract-notification-snapshot.service';
import { ContractNotificationCodeConstant } from 'modules/contract/domain/constants/contract-notification-code.constant';
import { LandlordLockGraceScanCommandHandler } from 'modules/contract/application/commands/landlord-lock-grace-scan/landlord-lock-grace-scan.command.handler';
import { LandlordLockGraceScanCommand } from 'modules/contract/application/commands/landlord-lock-grace-scan/landlord-lock-grace-scan.command';
import { LandlordLockCycleEntity } from 'modules/contract/domain/entities/landlord-lock-cycle.entity';
import { LandlordLockCycleRepository } from 'modules/contract/domain/repositories/landlord-lock-cycle.repository';
import { generateUuid, Uuid } from 'shared/domain/value-objects/uuid.vo';
import { OutboxRepository } from 'modules/outbox/domain/repositories/outbox.repository';
import { createLinkDependencies } from '../support/contract-link.fixture';
import { createContract, createMember } from '../support/contract-link.fixture';
import { ContractStatus } from 'modules/contract/domain/enums/contract-status.enum';
import { ContractRepository } from 'modules/contract/domain/repositories/contract.repository';
import { ContractMemberRepository } from 'modules/contract/domain/repositories/contract-member.repository';
import { LandlordLockEvidence } from 'modules/contract/application/ports/landlord-lock-evidence.port';

const LOCKED_AT = new Date('2026-11-14T00:00:00.000Z');
const GRACE_MS = 60_000;
const DEADLINE = new Date(LOCKED_AT.getTime() + GRACE_MS);

function setup() {
  const { context, unitOfWork, outbox } = createLinkDependencies();
  const landlordId = generateUuid();
  const contract = createContract(generateUuid(), landlordId);
  contract.suspend();
  const cycle = LandlordLockCycleEntity.create({
    id: generateUuid(),
    landlordId,
    lockedAt: LOCKED_AT,
    gracePeriodMs: GRACE_MS,
    contractIds: [contract.id],
  });
  const repository = {
    lockLandlord: jest.fn(async () => undefined),
    findLatestForUpdate: jest.fn<
      Promise<LandlordLockCycleEntity | null>,
      unknown[]
    >(async () => cycle),
    save: jest.fn(async () => undefined),
  };
  const dueCycles = {
    findDue: jest.fn(async (now: Date) =>
      ['pending', 'elapsed'].includes(cycle.state) && cycle.graceDeadline <= now
        ? [cycle]
        : [],
    ),
  };
  const evidence = {
    find: jest.fn<Promise<LandlordLockEvidence | null>, unknown[]>(
      async () => ({
        lockedAt: LOCKED_AT.toISOString(),
        unlockedAt: null,
        latestLockedAt: LOCKED_AT.toISOString(),
        observedAt: DEADLINE.toISOString(),
        state: 'locked',
      }),
    ),
  };
  const contracts = {
    findByIdsForUpdate: jest.fn(async () => [contract]),
    save: jest.fn(async () => undefined),
  };
  const memberId = generateUuid();
  const members = {
    findActiveByContract: jest.fn(async (id: Uuid) => [
      createMember(id, contract.tenantId),
      createMember(id, memberId),
      createMember(id, memberId),
      createMember(id),
    ]),
  };
  const rooms = {
    findById: jest.fn<Promise<{ name: string } | null>, [Uuid]>(async (id) => ({
      name: `Room ${id}`,
    })),
  };
  const createHandler = () =>
    new LandlordLockGraceScanCommandHandler(
      repository as unknown as LandlordLockCycleRepository,
      dueCycles,
      unitOfWork,
      evidence,
      contracts as unknown as ContractRepository,
      members as unknown as ContractMemberRepository,
      outbox as unknown as OutboxRepository,
      new ContractNotificationSnapshotService(
        rooms as unknown as RoomRepository,
      ),
    );
  return {
    rooms,
    context,
    evidence,
    contract,
    contracts,
    memberId,
    outbox,
    unitOfWork,
    cycle,
    repository,
    dueCycles,
    createHandler,
    handler: createHandler(),
  };
}

describe('LandlordLockGraceScanCommandHandler', () => {
  it('still terminates when the historical room has been deleted', async () => {
    const s = setup();
    s.rooms.findById.mockResolvedValue(null);
    await s.handler.execute(new LandlordLockGraceScanCommand(DEADLINE));
    expect(s.contract.status).toBe(ContractStatus.TERMINATED);
    expect(s.outbox.append.mock.calls[0][0][0].payload.notification).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          contracts: [
            {
              contractId: s.contract.id,
              contractCode: `HD-${s.contract.id.slice(0, 6)}`,
              roomName: null,
            },
          ],
        }),
      }),
    );
  });

  it('requests a decision for all pending contracts when reconciling a delayed unlock', async () => {
    const s = setup();
    const second = createContract(generateUuid(), s.cycle.landlordId);
    second.suspend();
    const foreign = createContract(generateUuid());
    foreign.suspend();
    const inactive = createContract(generateUuid(), s.cycle.landlordId);
    const cycle = LandlordLockCycleEntity.create({
      id: s.cycle.id,
      landlordId: s.cycle.landlordId,
      lockedAt: LOCKED_AT,
      gracePeriodMs: GRACE_MS,
      contractIds: [s.contract.id, second.id, foreign.id, inactive.id],
    });
    s.repository.findLatestForUpdate.mockResolvedValue(cycle);
    s.contracts.findByIdsForUpdate.mockResolvedValue([
      s.contract,
      second,
      foreign,
      inactive,
    ]);
    s.evidence.find.mockResolvedValue({
      lockedAt: LOCKED_AT.toISOString(),
      unlockedAt: new Date(DEADLINE.getTime() - 1).toISOString(),
      latestLockedAt: LOCKED_AT.toISOString(),
      observedAt: DEADLINE.toISOString(),
      state: 'unlocked',
    });
    await s.handler.execute(new LandlordLockGraceScanCommand(DEADLINE));
    const [messages, context] = s.outbox.append.mock.calls[0];
    expect(context).toBe(s.context);
    expect(messages).toHaveLength(1);
    expect(messages[0].payload.recipientUserIds).toEqual([s.cycle.landlordId]);
    expect(messages[0].payload.notification).toEqual(
      expect.objectContaining({
        title:
          ContractNotificationCodeConstant.CONTRACT_LOCK_DECISION_REQUIRED_TITLE,
        body: ContractNotificationCodeConstant.CONTRACT_LOCK_DECISION_REQUIRED_BODY,
        data: expect.objectContaining({
          messageKey: 'contract.lock_decision_required',
          contractIds: [s.contract.id, second.id],
          contracts: [s.contract, second].map((contract) => ({
            contractId: contract.id,
            contractCode: `HD-${contract.id.slice(0, 6)}`,
            roomName: `Room ${contract.roomId}`,
          })),
        }),
      }),
    );
    expect(s.repository.save).toHaveBeenCalledWith(cycle, s.context);
    expect(s.contracts.save).not.toHaveBeenCalled();
  });

  it('finds an existing deadline after handler recreation and marks it only once', async () => {
    const s = setup();
    const restarted = s.createHandler();
    expect(
      await restarted.execute(
        new LandlordLockGraceScanCommand(new Date(DEADLINE.getTime() - 1)),
      ),
    ).toBe(0);
    expect(
      await restarted.execute(new LandlordLockGraceScanCommand(DEADLINE)),
    ).toBe(1);
    expect(
      await restarted.execute(new LandlordLockGraceScanCommand(DEADLINE)),
    ).toBe(0);
    expect(s.dueCycles.findDue).toHaveBeenCalledWith(DEADLINE, 100);
    expect(s.repository.lockLandlord).toHaveBeenCalledWith(
      s.cycle.landlordId,
      s.context,
    );
    expect(s.repository.findLatestForUpdate).toHaveBeenCalledWith(
      s.cycle.landlordId,
      s.context,
    );
    expect(s.repository.save).toHaveBeenCalledTimes(1);
    expect(s.repository.save).toHaveBeenCalledWith(s.cycle, s.context);
    expect(s.cycle.state).toBe('completed');
    expect(s.contract.status).toBe(ContractStatus.TERMINATED);
    expect(s.contract.handoverRequired).toBe(true);
    expect(s.outbox.append).toHaveBeenCalledTimes(1);
    const [messages, context] = s.outbox.append.mock.calls[0];
    expect(context).toBe(s.context);
    expect(messages).toHaveLength(3);
    expect(messages.map((message) => message.payload.recipientUserIds)).toEqual(
      [[s.cycle.landlordId], [s.contract.tenantId], [s.memberId]],
    );
    for (const message of messages) {
      expect(message.payload).toEqual({
        sourceService: 'tenancy',
        recipientUserIds: message.payload.recipientUserIds,
        notification: {
          type: 'system',
          title: ContractNotificationCodeConstant.CONTRACT_TERMINATED_TITLE,
          body: ContractNotificationCodeConstant.CONTRACT_TERMINATED_BODY,
          data: {
            messageKey: 'contract.terminated_by_lock',
            landlordId: s.cycle.landlordId,
            lockCycleId: s.cycle.id,
            contractIds: [s.contract.id],
            contracts: [
              {
                contractId: s.contract.id,
                contractCode: `HD-${s.contract.id.slice(0, 6)}`,
                roomName: `Room ${s.contract.roomId}`,
              },
            ],
            action: 'terminate',
            graceDeadline: DEADLINE.toISOString(),
          },
        },
      });
    }
    expect(s.contracts.save).toHaveBeenCalledWith(s.contract, s.context);
    expect(s.rooms.findById).toHaveBeenCalledWith(s.contract.roomId, s.context);
  });

  it('ignores a previously selected deadline after a newer lock supersedes it', async () => {
    const s = setup();
    s.dueCycles.findDue.mockResolvedValue([s.cycle]);
    s.cycle.supersede();
    s.repository.findLatestForUpdate.mockResolvedValue(
      LandlordLockCycleEntity.create({
        id: generateUuid(),
        landlordId: s.cycle.landlordId,
        lockedAt: DEADLINE,
        gracePeriodMs: GRACE_MS,
        contractIds: s.cycle.contractIds,
      }),
    );
    expect(
      await s.handler.execute(new LandlordLockGraceScanCommand(DEADLINE)),
    ).toBe(0);
    expect(s.repository.save).not.toHaveBeenCalled();
    expect(s.cycle.state).toBe('superseded');
  });

  it('rechecks the deadline under the transaction lock before changing state', async () => {
    const s = setup();
    const current = LandlordLockCycleEntity.create({
      id: s.cycle.id,
      landlordId: s.cycle.landlordId,
      lockedAt: LOCKED_AT,
      gracePeriodMs: GRACE_MS * 2,
      contractIds: s.cycle.contractIds,
    });
    s.repository.findLatestForUpdate.mockResolvedValue(current);
    expect(
      await s.handler.execute(new LandlordLockGraceScanCommand(DEADLINE)),
    ).toBe(0);
    expect(current.state).toBe('pending');
    expect(s.repository.save).not.toHaveBeenCalled();
  });

  it('skips a candidate whose cycle no longer exists', async () => {
    const s = setup();
    s.repository.findLatestForUpdate.mockResolvedValue(null);
    expect(
      await s.handler.execute(new LandlordLockGraceScanCommand(DEADLINE)),
    ).toBe(0);
    expect(s.repository.save).not.toHaveBeenCalled();
  });

  it('reconciles elapsed P9-06 cycles using Identity evidence', async () => {
    const s = setup();
    s.cycle.reachGraceDeadline(DEADLINE);
    s.dueCycles.findDue.mockResolvedValue([s.cycle]);
    expect(
      await s.handler.execute(new LandlordLockGraceScanCommand(DEADLINE)),
    ).toBe(1);
    expect(s.cycle.state).toBe('completed');
    expect(s.contract.status).toBe(ContractStatus.TERMINATED);
  });

  it('protects a pre-deadline unlock delivered after the deadline', async () => {
    const s = setup();
    s.evidence.find.mockResolvedValue({
      lockedAt: LOCKED_AT.toISOString(),
      unlockedAt: new Date(DEADLINE.getTime() - 1).toISOString(),
      latestLockedAt: LOCKED_AT.toISOString(),
      observedAt: new Date(DEADLINE.getTime() + 60_000).toISOString(),
      state: 'unlocked',
    });
    await s.handler.execute(
      new LandlordLockGraceScanCommand(new Date(DEADLINE.getTime() + 60_000)),
    );
    expect(s.cycle.state).toBe('decision_pending');
    expect(s.contract.status).toBe(ContractStatus.SUSPENDED);
    expect(s.contracts.save).not.toHaveBeenCalled();
    expect(s.outbox.append.mock.calls[0][0]).toHaveLength(1);
    expect(s.outbox.append.mock.calls[0][1]).toBe(s.context);
    expect(s.outbox.append.mock.calls[0][0][0].payload).toEqual({
      sourceService: 'tenancy',
      recipientUserIds: [s.cycle.landlordId],
      notification: {
        type: 'system',
        title:
          ContractNotificationCodeConstant.CONTRACT_LOCK_DECISION_REQUIRED_TITLE,
        body: ContractNotificationCodeConstant.CONTRACT_LOCK_DECISION_REQUIRED_BODY,
        data: {
          messageKey: 'contract.lock_decision_required',
          landlordId: s.cycle.landlordId,
          lockCycleId: s.cycle.id,
          contractIds: [s.contract.id],
          contracts: [
            {
              contractId: s.contract.id,
              contractCode: `HD-${s.contract.id.slice(0, 6)}`,
              roomName: `Room ${s.contract.roomId}`,
            },
          ],
          action: 'decision_required',
          graceDeadline: DEADLINE.toISOString(),
        },
      },
    });
    await s.handler.execute(
      new LandlordLockGraceScanCommand(new Date(DEADLINE.getTime() + 60_000)),
    );
    expect(s.outbox.append).toHaveBeenCalledTimes(1);
  });

  it('treats unlock exactly at the deadline as expiry', async () => {
    const s = setup();
    s.evidence.find.mockResolvedValue({
      lockedAt: LOCKED_AT.toISOString(),
      unlockedAt: DEADLINE.toISOString(),
      latestLockedAt: LOCKED_AT.toISOString(),
      observedAt: DEADLINE.toISOString(),
      state: 'unlocked',
    });
    await s.handler.execute(new LandlordLockGraceScanCommand(DEADLINE));
    expect(s.contract.status).toBe(ContractStatus.TERMINATED);
  });

  it('retains historical elapsed cycles when Identity evidence is unavailable', async () => {
    const s = setup();
    s.cycle.reachGraceDeadline(DEADLINE);
    s.evidence.find.mockResolvedValue(null);
    expect(
      await s.handler.execute(new LandlordLockGraceScanCommand(DEADLINE)),
    ).toBe(0);
    expect(s.cycle.state).toBe('elapsed');
    expect(s.contract.status).toBe(ContractStatus.SUSPENDED);
  });

  it('waits for a newer lock instead of acting on an older cycle', async () => {
    const s = setup();
    s.evidence.find.mockResolvedValue({
      lockedAt: LOCKED_AT.toISOString(),
      unlockedAt: null,
      latestLockedAt: new Date(LOCKED_AT.getTime() + 1).toISOString(),
      observedAt: DEADLINE.toISOString(),
      state: 'locked',
    });
    expect(
      await s.handler.execute(new LandlordLockGraceScanCommand(DEADLINE)),
    ).toBe(0);
    expect(s.contracts.save).not.toHaveBeenCalled();
  });

  it('propagates persistence failure to the scheduler for rollback and retry', async () => {
    const s = setup();
    const failure = new Error('database unavailable');
    s.repository.save.mockRejectedValue(failure);
    await expect(
      s.handler.execute(new LandlordLockGraceScanCommand(DEADLINE)),
    ).rejects.toBe(failure);
    expect(s.unitOfWork.run).toHaveBeenCalledTimes(1);
  });
});
