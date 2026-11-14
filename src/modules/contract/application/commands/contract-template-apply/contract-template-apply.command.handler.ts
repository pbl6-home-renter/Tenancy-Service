import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { OutboxMessage } from 'modules/outbox/domain/entities/outbox-message.entity';
import { OutboxRepository } from 'modules/outbox/domain/repositories/outbox.repository';
import { OUTBOX_DI_TOKEN } from 'modules/outbox/outbox.di-token';
import { UNIT_OF_WORK_DI_TOKEN } from 'shared/application/di-tokens';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { DomainException } from 'shared/domain/exceptions/domain.exception';
import { CONTRACT_DI_TOKEN } from '../../../contract.di-token';
import { ContractEntity } from '../../../domain/entities/contract.entity';
import { ContractStatus } from '../../../domain/enums/contract-status.enum';
import { ContractForbiddenException } from '../../../domain/exceptions/contract-forbidden.exception';
import { ContractNotDraftException } from '../../../domain/exceptions/contract-not-draft.exception';
import { ContractRepository } from '../../../domain/repositories/contract.repository';
import { ContractTemplateRepository } from '../../../domain/repositories/contract-template.repository';
import { ContractTemplateApplyCommand } from './contract-template-apply.command';

class TemplateNotFoundException extends DomainException {
  constructor() {
    super('Contract template not found', 404, 'TEMPLATE_NOT_FOUND');
  }
}

class ContractNotFoundForTemplateException extends DomainException {
  constructor() {
    super('Contract not found', 404, 'CONTRACT_NOT_FOUND');
  }
}

@CommandHandler(ContractTemplateApplyCommand)
export class ContractTemplateApplyCommandHandler implements ICommandHandler<
  ContractTemplateApplyCommand,
  ContractEntity
> {
  constructor(
    @Inject(CONTRACT_DI_TOKEN.REPOSITORY)
    private readonly contracts: ContractRepository,
    @Inject(CONTRACT_DI_TOKEN.TEMPLATE_REPOSITORY)
    private readonly templates: ContractTemplateRepository,
    @Inject(UNIT_OF_WORK_DI_TOKEN) private readonly unitOfWork: IUnitOfWork,
    @Inject(OUTBOX_DI_TOKEN.REPOSITORY)
    private readonly outbox: OutboxRepository,
  ) {}

  execute(command: ContractTemplateApplyCommand): Promise<ContractEntity> {
    return this.unitOfWork.run(async (context) => {
      const contract = await this.contracts.findByIdForUpdate(
        command.contractId,
        context,
      );
      if (!contract) throw new ContractNotFoundForTemplateException();
      if (contract.landlordId !== command.landlordId)
        throw new ContractForbiddenException();
      if (contract.status !== ContractStatus.DRAFT)
        throw new ContractNotDraftException(contract.id);
      const template = await this.templates.findByKey(
        command.templateKey,
        context,
      );
      if (!template || !template.isActive || template.isDeleted)
        throw new TemplateNotFoundException();
      contract.applyTemplate(template.templateKey);
      await this.contracts.save(contract, context);
      await this.outbox.append(
        contract
          .pullDomainEvents()
          .map((event) => OutboxMessage.fromDomainEvent(event)),
        context,
      );
      return contract;
    });
  }
}
