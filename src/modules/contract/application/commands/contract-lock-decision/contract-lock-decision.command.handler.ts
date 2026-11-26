import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UNIT_OF_WORK_DI_TOKEN } from 'shared/application/di-tokens';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { RoomStatus } from 'modules/room/domain/enums/room-status.enum';
import { RoomRepository } from 'modules/room/domain/repositories/room.repository';
import { ROOM_DI_TOKEN } from 'modules/room/room.di-token';
import { OUTBOX_DI_TOKEN } from 'modules/outbox/outbox.di-token';
import { OutboxRepository } from 'modules/outbox/domain/repositories/outbox.repository';
import { OutboxMessage } from 'modules/outbox/domain/entities/outbox-message.entity';
import { CONTRACT_DI_TOKEN } from '../../../contract.di-token';
import { ContractRepository } from '../../../domain/repositories/contract.repository';
import { ContractMemberRepository } from '../../../domain/repositories/contract-member.repository';
import { LandlordLockCycleRepository } from '../../../domain/repositories/landlord-lock-cycle.repository';
import { LandlordLockCycleEntity } from '../../../domain/entities/landlord-lock-cycle.entity';
import { ContractStatus } from '../../../domain/enums/contract-status.enum';
import { ContractForbiddenException } from '../../../domain/exceptions/contract-forbidden.exception';
import { ContractNotFoundException } from '../../../domain/exceptions/contract-not-found.exception';
import { LandlordLockCycleNotFoundException } from '../../../domain/exceptions/landlord-lock-cycle-not-found.exception';
import { LandlordLockCycleStaleException } from '../../../domain/exceptions/landlord-lock-cycle-stale.exception';
import { LandlordLockCycleNotAwaitingDecisionException } from '../../../domain/exceptions/landlord-lock-cycle-not-awaiting-decision.exception';
import { ContractLockDecisionConflictException } from '../../../domain/exceptions/contract-lock-decision-conflict.exception';
import { ContractLockDecisionInvalidException } from '../../../domain/exceptions/contract-lock-decision-invalid.exception';
import { ContractRestoreRoomUnavailableException } from '../../../domain/exceptions/contract-restore-room-unavailable.exception';
import { ContractLockDecisionCommand } from './contract-lock-decision.command';
import { LandlordLockEvidencePort } from '../../ports/landlord-lock-evidence.port';
import { PeerServiceUnavailableException } from 'shared/application/http/peer-service.exception';
import { PeerService } from 'shared/application/http/peer-service.enum';
import { ContractNotificationSnapshotService } from '../../services/contract-notification-snapshot.service';

@CommandHandler(ContractLockDecisionCommand)
export class ContractLockDecisionCommandHandler implements ICommandHandler<
  ContractLockDecisionCommand,
  LandlordLockCycleEntity
> {
  constructor(
    @Inject(CONTRACT_DI_TOKEN.LANDLORD_LOCK_CYCLE)
    private readonly cycles: LandlordLockCycleRepository,
    @Inject(CONTRACT_DI_TOKEN.REPOSITORY)
    private readonly contracts: ContractRepository,
    @Inject(CONTRACT_DI_TOKEN.MEMBER_REPOSITORY)
    private readonly members: ContractMemberRepository,
    @Inject(ROOM_DI_TOKEN.REPOSITORY) private readonly rooms: RoomRepository,
    @Inject(OUTBOX_DI_TOKEN.REPOSITORY)
    private readonly outbox: OutboxRepository,
    @Inject(UNIT_OF_WORK_DI_TOKEN) private readonly unitOfWork: IUnitOfWork,
    @Inject(CONTRACT_DI_TOKEN.LANDLORD_LOCK_EVIDENCE)
    private readonly evidence: LandlordLockEvidencePort,
    private readonly notificationSnapshots: ContractNotificationSnapshotService,
  ) {}

  execute(
    command: ContractLockDecisionCommand,
  ): Promise<LandlordLockCycleEntity> {
    return this.unitOfWork.run(async (context) => {
      await this.cycles.lockLandlord(command.landlordId, context);
      const requested = await this.cycles.findById(
        command.lockCycleId,
        context,
      );
      if (!requested) throw new LandlordLockCycleNotFoundException();
      if (requested.landlordId !== command.landlordId)
        throw new ContractForbiddenException();
      const cycle = await this.cycles.findLatestForUpdate(
        command.landlordId,
        context,
      );
      if (!cycle || cycle.id !== requested.id || cycle.state === 'superseded')
        throw new LandlordLockCycleStaleException();
      const previous = cycle.decisions[command.contractId];
      if (previous) {
        if (previous.action !== command.action)
          throw new ContractLockDecisionConflictException();
        return cycle;
      }
      if (cycle.state !== 'decision_pending')
        throw new LandlordLockCycleNotAwaitingDecisionException();
      const evidence = await this.evidence.find(
        cycle.landlordId,
        cycle.lockedAt,
      );
      if (
        evidence?.latestLockedAt &&
        Date.parse(evidence.latestLockedAt) > cycle.lockedAt.getTime()
      )
        throw new LandlordLockCycleStaleException();
      if (
        !evidence ||
        evidence.state !== 'unlocked' ||
        !evidence.unlockedAt ||
        Date.parse(evidence.unlockedAt) >= cycle.graceDeadline.getTime()
      )
        throw new PeerServiceUnavailableException(
          PeerService.IDENTITY,
          'matching pre-deadline unlock evidence is unavailable',
        );
      if (!cycle.contractIds.includes(command.contractId)) {
        const outside = await this.contracts.findById(
          command.contractId,
          context,
        );
        if (!outside) throw new ContractNotFoundException(command.contractId);
        if (outside.landlordId !== command.landlordId)
          throw new ContractForbiddenException();
        throw new ContractLockDecisionInvalidException();
      }
      const contracts = await this.contracts.findByIdsForUpdate(
        cycle.contractIds,
        context,
      );
      const contract = contracts.find((item) => item.id === command.contractId);
      if (!contract) throw new ContractNotFoundException(command.contractId);
      if (contract.landlordId !== command.landlordId)
        throw new ContractForbiddenException();
      if (contract.status !== ContractStatus.SUSPENDED)
        throw new ContractLockDecisionInvalidException();
      if (command.action === 'restore') {
        const room = await this.rooms.findByIdForUpdate(
          contract.roomId,
          context,
        );
        if (
          !room ||
          room.landlordId !== command.landlordId ||
          room.status !== RoomStatus.OCCUPIED ||
          (await this.contracts.existsBlockingByRoom(
            room.id,
            contract.id,
            context,
          ))
        )
          throw new ContractRestoreRoomUnavailableException();
        contract.restoreAfterLandlordLock();
      } else {
        contract.terminateAfterLandlordLock(cycle.id);
      }
      cycle.recordDecision(contract.id, command.action, new Date(), 'landlord');
      cycle.completeIfResolved(
        contracts
          .filter((item) => item.status === ContractStatus.SUSPENDED)
          .map((item) => item.id),
      );
      const members = await this.members.findActiveByContract(
        contract.id,
        context,
      );
      const snapshots = await this.notificationSnapshots.create(
        [contract],
        context,
      );
      for (const recipient of contract
        .notificationRecipientIds(members.map((member) => member.tenantId))
        .filter((recipient) => recipient !== command.landlordId))
        cycle.requestResolutionNotification(
          recipient,
          snapshots,
          command.action,
        );
      await this.contracts.save(contract, context);
      await this.cycles.save(cycle, context);
      await this.outbox.append(
        cycle.pullDomainEvents().map(OutboxMessage.fromDomainEvent),
        context,
      );
      return cycle;
    });
  }
}
