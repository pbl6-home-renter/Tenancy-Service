import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { OutboxMessage } from 'modules/outbox/domain/entities/outbox-message.entity';
import { OutboxRepository } from 'modules/outbox/domain/repositories/outbox.repository';
import { OUTBOX_DI_TOKEN } from 'modules/outbox/outbox.di-token';
import { RoomNotFoundException } from 'modules/room/domain/exceptions/room-not-found.exception';
import { RoomRepository } from 'modules/room/domain/repositories/room.repository';
import { ROOM_DI_TOKEN } from 'modules/room/room.di-token';
import { UNIT_OF_WORK_DI_TOKEN } from 'shared/application/di-tokens';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { CONTRACT_DI_TOKEN } from '../../../contract.di-token';
import { ContractEntity } from '../../../domain/entities/contract.entity';
import { ContractForbiddenException } from '../../../domain/exceptions/contract-forbidden.exception';
import { ContractNotFoundException } from '../../../domain/exceptions/contract-not-found.exception';
import { SettlementNotReadyException } from '../../../domain/exceptions/settlement-not-ready.exception';
import { ContractMemberRepository } from '../../../domain/repositories/contract-member.repository';
import { ContractRepository } from '../../../domain/repositories/contract.repository';
import { ContractSettlementPort } from '../../ports/contract-settlement.port';
import { ContractCheckoutCompleteCommand } from './contract-checkout-complete.command';
import { ContractLifecycleNotificationRequestedEvent } from '../../../domain/events/contract-lifecycle-notification-requested.event';
import { ContractMemberNotificationSnapshotService } from '../../services/contract-member-notification-snapshot.service';

@CommandHandler(ContractCheckoutCompleteCommand)
export class ContractCheckoutCompleteCommandHandler implements ICommandHandler<
  ContractCheckoutCompleteCommand,
  ContractEntity
> {
  constructor(
    @Inject(CONTRACT_DI_TOKEN.REPOSITORY)
    private readonly contractRepository: ContractRepository,
    @Inject(CONTRACT_DI_TOKEN.MEMBER_REPOSITORY)
    private readonly memberRepository: ContractMemberRepository,
    @Inject(ROOM_DI_TOKEN.REPOSITORY)
    private readonly roomRepository: RoomRepository,
    @Inject(CONTRACT_DI_TOKEN.SETTLEMENT)
    private readonly settlement: ContractSettlementPort,
    @Inject(UNIT_OF_WORK_DI_TOKEN)
    private readonly unitOfWork: IUnitOfWork,
    @Inject(OUTBOX_DI_TOKEN.REPOSITORY)
    private readonly outboxRepository: OutboxRepository,
    private readonly notificationSnapshots: ContractMemberNotificationSnapshotService,
  ) {}

  execute(command: ContractCheckoutCompleteCommand): Promise<ContractEntity> {
    return this.unitOfWork.run(async (context) => {
      const contract = await this.contractRepository.findByIdForUpdate(
        command.contractId,
        context,
      );
      if (!contract) throw new ContractNotFoundException(command.contractId);
      if (contract.landlordId !== command.landlordId) {
        throw new ContractForbiddenException();
      }

      // Legacy handover uses only the persisted marker, never the removed lock-cycle table.
      const lockHandover = contract.lockTerminationCycleId !== null;
      if (lockHandover && !contract.completeLockHandover(command.completedOn))
        return contract;
      if (!lockHandover) contract.terminate(command.completedOn);
      if (
        !lockHandover &&
        !(await this.settlement.isPeriodSettled(
          contract.id,
          command.completedOn.toISOString().slice(0, 7),
          context,
        ))
      ) {
        throw new SettlementNotReadyException();
      }

      const members = await this.memberRepository.findActiveByContract(
        contract.id,
        context,
      );
      const recipientUserIds = [
        ...new Set(
          [
            contract.tenantId,
            ...members.map((member) => member.tenantId),
          ].filter(
            (id): id is Uuid => id !== null && id !== command.landlordId,
          ),
        ),
      ];
      for (const member of members) {
        member.leave(command.completedOn, true);
      }

      const room = await this.roomRepository.findByIdForUpdate(
        contract.roomId,
        context,
      );
      if (!room) throw new RoomNotFoundException(contract.roomId);
      room.releaseByContract();

      await this.contractRepository.save(contract, context);
      await this.memberRepository.saveMany(members, context);
      await this.roomRepository.save(room, context);
      const events = [
        ...contract.pullDomainEvents(),
        ...members.flatMap((member) => member.pullDomainEvents()),
        ...room.pullDomainEvents(),
      ];
      if (recipientUserIds.length > 0) {
        const snapshot = await this.notificationSnapshots.create(
          contract,
          context,
        );
        events.push(
          new ContractLifecycleNotificationRequestedEvent(
            contract.id,
            recipientUserIds,
            {
              messageKey: 'contract.checked_out',
              ...snapshot,
              endDate: contract.endDate,
            },
          ),
        );
      }
      await this.outboxRepository.append(
        events.map((event) => OutboxMessage.fromDomainEvent(event)),
        context,
      );
      return contract;
    });
  }
}
