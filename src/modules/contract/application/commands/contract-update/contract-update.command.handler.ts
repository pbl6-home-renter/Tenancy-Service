import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { OutboxMessage } from 'modules/outbox/domain/entities/outbox-message.entity';
import { OutboxRepository } from 'modules/outbox/domain/repositories/outbox.repository';
import { OUTBOX_DI_TOKEN } from 'modules/outbox/outbox.di-token';
import { UNIT_OF_WORK_DI_TOKEN } from 'shared/application/di-tokens';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { CONTRACT_DI_TOKEN } from '../../../contract.di-token';
import { ContractEntity } from '../../../domain/entities/contract.entity';
import { ContractForbiddenException } from '../../../domain/exceptions/contract-forbidden.exception';
import { ContractNotFoundException } from '../../../domain/exceptions/contract-not-found.exception';
import { ContractRepository } from '../../../domain/repositories/contract.repository';
import { ContractUpdateCommand } from './contract-update.command';

@CommandHandler(ContractUpdateCommand)
export class ContractUpdateCommandHandler implements ICommandHandler<
  ContractUpdateCommand,
  ContractEntity
> {
  constructor(
    @Inject(CONTRACT_DI_TOKEN.REPOSITORY)
    private readonly contractRepository: ContractRepository,
    @Inject(UNIT_OF_WORK_DI_TOKEN)
    private readonly unitOfWork: IUnitOfWork,
    @Inject(OUTBOX_DI_TOKEN.REPOSITORY)
    private readonly outboxRepository: OutboxRepository,
  ) {}

  execute(command: ContractUpdateCommand): Promise<ContractEntity> {
    return this.unitOfWork.run(async (context) => {
      const contract = await this.contractRepository.findByIdForUpdate(
        command.contractId,
        context,
      );
      if (!contract) {
        throw new ContractNotFoundException(command.contractId);
      }
      if (contract.landlordId !== command.landlordId) {
        throw new ContractForbiddenException();
      }

      contract.updateDraft(command.updates);
      await this.contractRepository.save(contract, context);
      await this.outboxRepository.append(
        contract
          .pullDomainEvents()
          .map((event) => OutboxMessage.fromDomainEvent(event)),
        context,
      );
      return contract;
    });
  }
}
