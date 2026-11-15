import { LandlordLockGraceScanCommandHandler } from 'modules/contract/application/commands/landlord-lock-grace-scan/landlord-lock-grace-scan.command.handler';
import { LandlordLockGraceScanCommand } from 'modules/contract/application/commands/landlord-lock-grace-scan/landlord-lock-grace-scan.command';
import { LandlordLockCycleEntity } from 'modules/contract/domain/entities/landlord-lock-cycle.entity';
import { LandlordLockCycleRepository } from 'modules/contract/domain/repositories/landlord-lock-cycle.repository';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';
import { createLinkDependencies } from '../support/contract-link.fixture';

const LOCKED_AT = new Date('2026-11-14T00:00:00.000Z');
const GRACE_MS = 60_000;
const DEADLINE = new Date(LOCKED_AT.getTime() + GRACE_MS);

function setup() {
  const { context, unitOfWork } = createLinkDependencies();
  const cycle = LandlordLockCycleEntity.create({
    id: generateUuid(),
    landlordId: generateUuid(),
    lockedAt: LOCKED_AT,
    gracePeriodMs: GRACE_MS,
    contractIds: [generateUuid()],
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
      cycle.state === 'pending' && cycle.graceDeadline <= now ? [cycle] : [],
    ),
  };
  const createHandler = () =>
    new LandlordLockGraceScanCommandHandler(
      repository as unknown as LandlordLockCycleRepository,
      dueCycles,
      unitOfWork,
    );
  return {
    context,
    unitOfWork,
    cycle,
    repository,
    dueCycles,
    createHandler,
    handler: createHandler(),
  };
}

describe('LandlordLockGraceScanCommandHandler', () => {
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
    expect(s.cycle.state).toBe('elapsed');
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

  it('does not process an elapsed cycle returned by an outdated due query', async () => {
    const s = setup();
    s.cycle.reachGraceDeadline(DEADLINE);
    s.dueCycles.findDue.mockResolvedValue([s.cycle]);
    expect(
      await s.handler.execute(new LandlordLockGraceScanCommand(DEADLINE)),
    ).toBe(0);
    expect(s.repository.save).not.toHaveBeenCalled();
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
