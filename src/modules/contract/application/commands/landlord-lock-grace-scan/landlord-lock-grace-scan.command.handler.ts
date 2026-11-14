import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UNIT_OF_WORK_DI_TOKEN } from 'shared/application/di-tokens';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { CONTRACT_DI_TOKEN } from '../../../contract.di-token';
import { LandlordLockCycleRepository } from '../../../domain/repositories/landlord-lock-cycle.repository';
import { LandlordLockCycleDueQueryPort } from '../../ports/landlord-lock-cycle-due-query.port';
import { LandlordLockGraceScanCommand } from './landlord-lock-grace-scan.command';

const GRACE_SCAN_BATCH_SIZE = 100;

@CommandHandler(LandlordLockGraceScanCommand)
export class LandlordLockGraceScanCommandHandler implements ICommandHandler<
  LandlordLockGraceScanCommand,
  number
> {
  constructor(
    @Inject(CONTRACT_DI_TOKEN.LANDLORD_LOCK_CYCLE)
    private readonly landlordLockCycleRepository: LandlordLockCycleRepository,
    @Inject(CONTRACT_DI_TOKEN.LANDLORD_LOCK_CYCLE_DUE_QUERY)
    private readonly dueCycles: LandlordLockCycleDueQueryPort,
    @Inject(UNIT_OF_WORK_DI_TOKEN)
    private readonly unitOfWork: IUnitOfWork,
  ) {}

  async execute(command: LandlordLockGraceScanCommand): Promise<number> {
    const { now } = command;
    const due = await this.dueCycles.findDue(now, GRACE_SCAN_BATCH_SIZE);
    let reached = 0;
    for (const candidate of due) {
      await this.unitOfWork.run(async (context) => {
        await this.landlordLockCycleRepository.lockLandlord(
          candidate.landlordId,
          context,
        );
        const cycle =
          await this.landlordLockCycleRepository.findLatestForUpdate(
            candidate.landlordId,
            context,
          );
        if (
          !cycle ||
          cycle.id !== candidate.id ||
          cycle.graceDeadline.getTime() !== candidate.graceDeadline.getTime() ||
          !cycle.reachGraceDeadline(now)
        ) {
          return;
        }
        // P9-07 owns unlock decisions and termination; retain the cycle for it.
        await this.landlordLockCycleRepository.save(cycle, context);
        reached++;
      });
    }
    return reached;
  }
}
