import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { OutboxMessage } from 'modules/outbox/domain/entities/outbox-message.entity';
import { OutboxRepository } from 'modules/outbox/domain/repositories/outbox.repository';
import { OUTBOX_DI_TOKEN } from 'modules/outbox/outbox.di-token';
import { UNIT_OF_WORK_DI_TOKEN } from 'shared/application/di-tokens';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { CONTRACT_DI_TOKEN } from '../../../contract.di-token';
import { ContractMember } from '../../../domain/entities/contract-member.entity';
import { ContractRepository } from '../../../domain/repositories/contract.repository';
import { ContractMemberRepository } from '../../../domain/repositories/contract-member.repository';
import { ContractNotFoundException } from '../../../domain/exceptions/contract-not-found.exception';
import { ContractForbiddenException } from '../../../domain/exceptions/contract-forbidden.exception';
import { MemberAlreadyExistsException } from '../../../domain/exceptions/member-already-exists.exception';
import { ContractMemberNotFoundException } from '../../../domain/exceptions/contract-member-not-found.exception';
import { ContractMemberUpdateCommand } from './contract-member-update.command';

@CommandHandler(ContractMemberUpdateCommand)
export class ContractMemberUpdateCommandHandler implements ICommandHandler<
  ContractMemberUpdateCommand,
  ContractMember
> {
  constructor(
    @Inject(CONTRACT_DI_TOKEN.REPOSITORY)
    private readonly contracts: ContractRepository,
    @Inject(CONTRACT_DI_TOKEN.MEMBER_REPOSITORY)
    private readonly members: ContractMemberRepository,
    @Inject(UNIT_OF_WORK_DI_TOKEN) private readonly unitOfWork: IUnitOfWork,
    @Inject(OUTBOX_DI_TOKEN.REPOSITORY)
    private readonly outbox: OutboxRepository,
  ) {}

  execute(command: ContractMemberUpdateCommand): Promise<ContractMember> {
    return this.unitOfWork.run(async (context) => {
      const contract = await this.contracts.findByIdForUpdate(
        command.contractId,
        context,
      );
      if (!contract) throw new ContractNotFoundException(command.contractId);
      if (contract.landlordId !== command.landlordId)
        throw new ContractForbiddenException();
      const contractMember =
        await this.members.findByTenantAndContractForUpdate(
          command.tenantId,
          contract.id,
          context,
        );
      if (!contractMember) throw new ContractMemberNotFoundException();
      contractMember.updatePhone(command.tenantPhone);
      if (
        await this.members.existsActiveDuplicate(
          contract.id,
          {
            tenantId: contractMember.tenantId,
            tenantPhone: contractMember.tenantPhone?.value ?? null,
            excludeId: contractMember.id,
          },
          context,
        )
      )
        throw new MemberAlreadyExistsException();
      await this.members.save(contractMember, context);
      await this.outbox.append(
        contractMember
          .pullDomainEvents()
          .map((event) => OutboxMessage.fromDomainEvent(event)),
        context,
      );
      return contractMember;
    });
  }
}
