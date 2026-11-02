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
import { ContractMemberNotFoundException } from '../../../domain/exceptions/contract-member-not-found.exception';
import { ContractNotActiveException } from '../../../domain/exceptions/contract-not-active.exception';
import { LeftDateInvalidException } from '../../../domain/exceptions/left-date-invalid.exception';
import { ContractStatus } from '../../../domain/enums/contract-status.enum';
import { ContractMemberLeaveCommand } from './contract-member-leave.command';

@CommandHandler(ContractMemberLeaveCommand)
export class ContractMemberLeaveCommandHandler implements ICommandHandler<
  ContractMemberLeaveCommand,
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

  execute(command: ContractMemberLeaveCommand): Promise<ContractMember> {
    return this.unitOfWork.run(async (context) => {
      const contract = await this.contracts.findByIdForUpdate(
        command.contractId,
        context,
      );
      if (!contract) throw new ContractNotFoundException(command.contractId);
      if (contract.landlordId !== command.landlordId)
        throw new ContractForbiddenException();
      if (contract.status !== ContractStatus.ACTIVE)
        throw new ContractNotActiveException();
      const contractMember =
        await this.members.findByTenantAndContractForUpdate(
          command.tenantId,
          contract.id,
          context,
        );
      if (!contractMember) throw new ContractMemberNotFoundException();
      const leftOn = new Date(command.leftOn);
      leftOn.setUTCHours(0, 0, 0, 0);
      if (leftOn.getTime() > new Date(contract.endDate).getTime())
        throw new LeftDateInvalidException();
      contractMember.leave(leftOn);
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
