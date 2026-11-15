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
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';
import { OutboxRepository } from 'modules/outbox/domain/repositories/outbox.repository';
import {
  createContract,
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
  cycle.beginDecision(unlockedAt, cycle.contractIds);
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
  const members = { findActiveByContract: jest.fn(async () => []) };
  const rooms = {
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
    landlordId,
  };
}

describe('ContractLockDecisionCommandHandler', () => {
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
    expect(s.outbox.append.mock.calls[0][0]).toHaveLength(2);
    expect(s.outbox.append.mock.calls[1][0]).toHaveLength(2);
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
