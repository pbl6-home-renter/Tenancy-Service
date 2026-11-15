import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UNIT_OF_WORK_DI_TOKEN } from 'shared/application/di-tokens';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { CONTRACT_DI_TOKEN } from '../../../contract.di-token';
import { LandlordLockCycleRepository } from '../../../domain/repositories/landlord-lock-cycle.repository';
import { LandlordLockCycleDueQueryPort } from '../../ports/landlord-lock-cycle-due-query.port';
import { LandlordLockGraceScanCommand } from './landlord-lock-grace-scan.command';
import { LandlordLockEvidencePort } from '../../ports/landlord-lock-evidence.port';
import { ContractRepository } from '../../../domain/repositories/contract.repository';
import { ContractMemberRepository } from '../../../domain/repositories/contract-member.repository';
import { ContractStatus } from '../../../domain/enums/contract-status.enum';
import { OUTBOX_DI_TOKEN } from 'modules/outbox/outbox.di-token';
import { OutboxRepository } from 'modules/outbox/domain/repositories/outbox.repository';
import { OutboxMessage } from 'modules/outbox/domain/entities/outbox-message.entity';

const GRACE_SCAN_BATCH_SIZE = 100;

@CommandHandler(LandlordLockGraceScanCommand)
export class LandlordLockGraceScanCommandHandler implements ICommandHandler<
  LandlordLockGraceScanCommand,
  number
> {
  private readonly logger = new Logger(
    LandlordLockGraceScanCommandHandler.name,
  );
  constructor(
    @Inject(CONTRACT_DI_TOKEN.LANDLORD_LOCK_CYCLE)
    private readonly landlordLockCycleRepository: LandlordLockCycleRepository,
    @Inject(CONTRACT_DI_TOKEN.LANDLORD_LOCK_CYCLE_DUE_QUERY)
    private readonly dueCycles: LandlordLockCycleDueQueryPort,
    @Inject(UNIT_OF_WORK_DI_TOKEN)
    private readonly unitOfWork: IUnitOfWork,
    @Inject(CONTRACT_DI_TOKEN.LANDLORD_LOCK_EVIDENCE)
    private readonly evidence: LandlordLockEvidencePort,
    @Inject(CONTRACT_DI_TOKEN.REPOSITORY)
    private readonly contracts: ContractRepository,
    @Inject(CONTRACT_DI_TOKEN.MEMBER_REPOSITORY)
    private readonly members: ContractMemberRepository,
    @Inject(OUTBOX_DI_TOKEN.REPOSITORY)
    private readonly outbox: OutboxRepository,
  ) {}

  async execute(command: LandlordLockGraceScanCommand): Promise<number> {
    const { now } = command;
    const due = await this.dueCycles.findDue(now, GRACE_SCAN_BATCH_SIZE);
    let reached = 0;
    for (const candidate of due) {
      const evidence = await this.evidence.find(
        candidate.landlordId,
        candidate.lockedAt,
      );
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
          !['pending', 'elapsed'].includes(cycle.state) ||
          cycle.graceDeadline > now
        )
          return;
        if (
          !evidence ||
          evidence.state === 'unknown' ||
          (evidence.latestLockedAt &&
            Date.parse(evidence.latestLockedAt) > cycle.lockedAt.getTime())
        ) {
          cycle.recordReconciliation(now);
          await this.landlordLockCycleRepository.save(cycle, context);
          this.logger.warn(
            `Lock cycle ${cycle.id} requires Identity reconciliation`,
          );
          return;
        }
        const contracts = (
          await this.contracts.findByIdsForUpdate(cycle.contractIds, context)
        ).filter(
          (contract) =>
            contract.landlordId === cycle.landlordId &&
            contract.status === ContractStatus.SUSPENDED,
        );
        const unlockedAt = evidence.unlockedAt
          ? new Date(evidence.unlockedAt)
          : null;
        if (unlockedAt && unlockedAt < cycle.graceDeadline) {
          cycle.beginDecision(
            unlockedAt,
            contracts.map((contract) => contract.id),
          );
        } else {
          if (Date.parse(evidence.observedAt) < cycle.graceDeadline.getTime())
            return;
          for (const contract of contracts) {
            contract.terminateAfterLandlordLock(cycle.id);
            cycle.recordDecision(
              contract.id,
              'terminate',
              now,
              'grace_expired',
            );
            const members = await this.members.findActiveByContract(
              contract.id,
              context,
            );
            for (const recipient of contract.notificationRecipientIds(
              members.map((member) => member.tenantId),
            ))
              cycle.requestResolutionNotification(
                recipient,
                [contract.id],
                'terminate',
              );
            await this.contracts.save(contract, context);
          }
          cycle.completeIfResolved([]);
        }
        await this.landlordLockCycleRepository.save(cycle, context);
        await this.outbox.append(
          cycle.pullDomainEvents().map(OutboxMessage.fromDomainEvent),
          context,
        );
        reached++;
      });
    }
    return reached;
  }
}
