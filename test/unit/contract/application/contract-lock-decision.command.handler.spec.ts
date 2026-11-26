import { ContractNotificationSnapshotService } from 'modules/contract/application/services/contract-notification-snapshot.service';
import { ContractNotificationCodeConstant } from 'modules/contract/domain/constants/contract-notification-code.constant';
import { ContractLockDecisionCommand } from 'modules/contract/application/commands/contract-lock-decision/contract-lock-decision.command';
import { ContractLockDecisionCommandHandler } from 'modules/contract/application/commands/contract-lock-decision/contract-lock-decision.command.handler';
import { LandlordLockCycleEntity } from 'modules/contract/domain/entities/landlord-lock-cycle.entity';
import { LandlordLockCycleRepository } from 'modules/contract/domain/repositories/landlord-lock-cycle.repository';
import { ContractRepository } from 'modules/contract/domain/repositories/contract.repository';
import { ContractMemberRepository } from 'modules/contract/domain/repositories/contract-member.repository';
import { ContractStatus } from 'modules/contract/domain/enums/contract-status.enum';
import { RoomStatus } from 'modules/room/domain/enums/room-status.enum';
import { RoomRepository } from 'modules/room/domain/repositories/room.repository';
import { ContractLockDecisionResponseDto } from 'modules/contract/presentation/http/responses/contract-lock-decision.response.dto';
import { generateUuid, Uuid } from 'shared/domain/value-objects/uuid.vo';
import { OutboxRepository } from 'modules/outbox/domain/repositories/outbox.repository';
import {
  createContract,
  createMember,
  createLinkDependencies,
} from '../support/contract-link.fixture';

jest.mock('@nestjs/swagger', () => ({ ApiProperty: () => () => undefined }));

function setup() {
  const deps = createLinkDependencies();
  const landlordId = generateUuid();
  const first = createContract(generateUuid(), landlordId);
  const second = createContract(generateUuid(), landlordId);
  first.suspend();
  second.suspend();
  const lockedAt = new Date('2026-11-14T00:00:00.000Z');
  const unlockedAt = new Date('2026-11-14T00:00:30.000Z');
  const cycle = LandlordLockCycleEntity.create({
    id: generateUuid(),
    landlordId,
    lockedAt,
    gracePeriodMs: 60_000,
    contractIds: [first.id, second.id],
  });
  cycle.beginDecision(
    unlockedAt,
    [first, second].map((contract) => ({
      contractId: contract.id,
      contractCode: `HD-${contract.id.slice(0, 6)}`,
      roomName: `Room ${contract.roomId}`,
    })),
  );
  cycle.pullDomainEvents();
  const cycles = {
    lockLandlord: jest.fn(async () => undefined),
    findById: jest.fn(async () => cycle),
    findLatestForUpdate: jest.fn(async () => cycle),
    save: jest.fn(async () => undefined),
  };
  const contracts = {
    findByIdsForUpdate: jest.fn(async () => [first, second]),
    existsBlockingByRoom: jest.fn(async () => false),
    save: jest.fn(async () => undefined),
  };
  const members = {
    findActiveByContract: jest.fn(async (id: Uuid) => [
      createMember(id, id === first.id ? first.tenantId : second.tenantId),
      createMember(id, id === first.id ? first.tenantId : second.tenantId),
      createMember(id, landlordId),
      createMember(id),
    ]),
  };
  const rooms = {
    findById: jest.fn(async (id: Uuid) => ({ name: `Room ${id}` })),
    findByIdForUpdate: jest.fn(async () => ({
      landlordId,
      status: RoomStatus.OCCUPIED,
    })),
  };
  const evidence = {
    find: jest.fn(async () => ({
      lockedAt: lockedAt.toISOString(),
      unlockedAt: unlockedAt.toISOString(),
      latestLockedAt: lockedAt.toISOString(),
      observedAt: new Date().toISOString(),
      state: 'unlocked' as const,
    })),
  };
  const handler = new ContractLockDecisionCommandHandler(
    cycles as unknown as LandlordLockCycleRepository,
    contracts as unknown as ContractRepository,
    members as unknown as ContractMemberRepository,
    rooms as unknown as RoomRepository,
    deps.outbox as unknown as OutboxRepository,
    deps.unitOfWork,
    evidence,
    new ContractNotificationSnapshotService(rooms as unknown as RoomRepository),
  );
  return {
    ...deps,
    first,
    second,
    cycle,
    cycles,
    contracts,
    rooms,
    evidence,
    handler,
    members,
    landlordId,
  };
}

describe('ContractLockDecisionCommandHandler', () => {
  it.each([
    [
      'restore',
      'contract.restored',
      ContractNotificationCodeConstant.CONTRACT_RESTORED_TITLE,
      ContractNotificationCodeConstant.CONTRACT_RESTORED_BODY,
    ],
    [
      'terminate',
      'contract.terminated_by_lock',
      ContractNotificationCodeConstant.CONTRACT_TERMINATED_TITLE,
      ContractNotificationCodeConstant.CONTRACT_TERMINATED_BODY,
    ],
  ] as const)(
    'emits %s only to distinct tenants and members, excluding the acting landlord',
    async (action, messageKey, title, body) => {
      const s = setup();
      const memberId = generateUuid();
      s.members.findActiveByContract.mockResolvedValue([
        createMember(s.first.id, s.first.tenantId),
        createMember(s.first.id, memberId),
        createMember(s.first.id, memberId),
        createMember(s.first.id, s.landlordId),
        createMember(s.first.id),
      ]);
      await s.handler.execute(
        new ContractLockDecisionCommand(
          s.landlordId,
          s.first.id,
          s.cycle.id,
          action,
        ),
      );
      const [messages, context] = s.outbox.append.mock.calls[0];
      expect(context).toBe(s.context);
      expect(messages).toHaveLength(2);
      expect(
        messages.map((message) => message.payload.recipientUserIds),
      ).toEqual([[s.first.tenantId], [memberId]]);
      for (const message of messages) {
        expect(message.payload).toEqual({
          sourceService: 'tenancy',
          recipientUserIds: message.payload.recipientUserIds,
          notification: {
            type: 'system',
            title,
            body,
            data: {
              messageKey,
              action,
              landlordId: s.landlordId,
              lockCycleId: s.cycle.id,
              contractIds: [s.first.id],
              contracts: [
                {
                  contractId: s.first.id,
                  contractCode: `HD-${s.first.id.slice(0, 6)}`,
                  roomName: `Room ${s.first.roomId}`,
                },
              ],
              graceDeadline: s.cycle.graceDeadline.toISOString(),
            },
          },
        });
      }
      expect(s.rooms.findById).toHaveBeenCalledWith(s.first.roomId, s.context);
      expect(s.contracts.save).toHaveBeenCalledWith(s.first, s.context);
      expect(s.cycles.save).toHaveBeenCalledWith(s.cycle, s.context);
    },
  );

  it('restores A and terminates B independently, replaying the stored results exactly once', async () => {
    const s = setup();
    const restore = new ContractLockDecisionCommand(
      s.landlordId,
      s.first.id,
      s.cycle.id,
      'restore',
    );
    const terminate = new ContractLockDecisionCommand(
      s.landlordId,
      s.second.id,
      s.cycle.id,
      'terminate',
    );
    const restored = ContractLockDecisionResponseDto.fromDomain(
      await s.handler.execute(restore),
      s.first.id,
    );
    expect(s.cycle.state).toBe('decision_pending');
    expect(s.second.status).toBe(ContractStatus.SUSPENDED);
    const terminated = ContractLockDecisionResponseDto.fromDomain(
      await s.handler.execute(terminate),
      s.second.id,
    );
    expect(s.cycle.state).toBe('completed');
    expect(s.first.status).toBe(ContractStatus.ACTIVE);
    expect(s.second.status).toBe(ContractStatus.TERMINATED);
    expect(s.second.handoverRequired).toBe(true);
    expect(
      ContractLockDecisionResponseDto.fromDomain(
        await s.handler.execute(restore),
        s.first.id,
      ),
    ).toEqual(restored);
    expect(
      ContractLockDecisionResponseDto.fromDomain(
        await s.handler.execute(terminate),
        s.second.id,
      ),
    ).toEqual(terminated);
    expect(s.contracts.save).toHaveBeenCalledTimes(2);
    expect(s.outbox.append).toHaveBeenCalledTimes(2);
    expect(s.outbox.append.mock.calls[0][0]).toHaveLength(1);
    expect(s.outbox.append.mock.calls[1][0]).toHaveLength(1);
    expect(s.first.pullDomainEvents()).toHaveLength(0);
    expect(s.second.pullDomainEvents()).toHaveLength(0);
  });

  it('rejects an opposite decision without repeating the transition or notice', async () => {
    const s = setup();
    await s.handler.execute(
      new ContractLockDecisionCommand(
        s.landlordId,
        s.first.id,
        s.cycle.id,
        'restore',
      ),
    );
    await expect(
      s.handler.execute(
        new ContractLockDecisionCommand(
          s.landlordId,
          s.first.id,
          s.cycle.id,
          'terminate',
        ),
      ),
    ).rejects.toMatchObject({ code: 'CONTRACT_LOCK_DECISION_CONFLICT' });
    expect(s.outbox.append).toHaveBeenCalledTimes(1);
  });

  it('rejects a cycle after another lock supersedes it', async () => {
    const s = setup();
    s.cycle.supersede();
    await expect(
      s.handler.execute(
        new ContractLockDecisionCommand(
          s.landlordId,
          s.first.id,
          s.cycle.id,
          'restore',
        ),
      ),
    ).rejects.toMatchObject({ code: 'LANDLORD_LOCK_CYCLE_STALE' });
    expect(s.contracts.save).not.toHaveBeenCalled();
  });

  it('refuses restoration when another contract occupies the room', async () => {
    const s = setup();
    s.contracts.existsBlockingByRoom.mockResolvedValue(true);
    await expect(
      s.handler.execute(
        new ContractLockDecisionCommand(
          s.landlordId,
          s.first.id,
          s.cycle.id,
          'restore',
        ),
      ),
    ).rejects.toMatchObject({ code: 'CONTRACT_RESTORE_ROOM_UNAVAILABLE' });
    expect(s.first.status).toBe(ContractStatus.SUSPENDED);
  });

  it('detects a relock in Identity before its event reaches Tenancy', async () => {
    const s = setup();
    s.evidence.find.mockResolvedValue({
      lockedAt: s.cycle.lockedAt.toISOString(),
      unlockedAt: s.cycle.unlockedAt!.toISOString(),
      latestLockedAt: new Date(
        s.cycle.lockedAt.getTime() + 60_000,
      ).toISOString(),
      observedAt: new Date().toISOString(),
      state: 'unlocked',
    });
    await expect(
      s.handler.execute(
        new ContractLockDecisionCommand(
          s.landlordId,
          s.first.id,
          s.cycle.id,
          'restore',
        ),
      ),
    ).rejects.toMatchObject({ code: 'LANDLORD_LOCK_CYCLE_STALE' });
    expect(s.contracts.save).not.toHaveBeenCalled();
  });
});
