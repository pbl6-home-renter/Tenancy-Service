import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { OutboxMessage } from 'modules/outbox/domain/entities/outbox-message.entity';
import { OutboxRepository } from 'modules/outbox/domain/repositories/outbox.repository';
import { OUTBOX_DI_TOKEN } from 'modules/outbox/outbox.di-token';
import { UNIT_OF_WORK_DI_TOKEN } from 'shared/application/di-tokens';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { CONTRACT_DI_TOKEN } from '../../../contract.di-token';
import { TenantUserProjectionPort } from '../../ports/tenant-user-projection.port';
import { TenantPhone } from '../../../domain/value-objects/tenant-phone.vo';
import { ContractMember } from '../../../domain/entities/contract-member.entity';
import { ContractRepository } from '../../../domain/repositories/contract.repository';
import { ContractMemberRepository } from '../../../domain/repositories/contract-member.repository';
import { ContractNotFoundException } from '../../../domain/exceptions/contract-not-found.exception';
import { ContractForbiddenException } from '../../../domain/exceptions/contract-forbidden.exception';
import { MemberAlreadyExistsException } from '../../../domain/exceptions/member-already-exists.exception';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { ContractNotActiveException } from '../../../domain/exceptions/contract-not-active.exception';
import { ContractStatus } from '../../../domain/enums/contract-status.enum';
import { ContractMemberAddCommand } from './contract-member-add.command';

@CommandHandler(ContractMemberAddCommand)
export class ContractMemberAddCommandHandler implements ICommandHandler<
  ContractMemberAddCommand,
  ContractMember
> {
  constructor(
    @Inject(CONTRACT_DI_TOKEN.TENANT_USER_PROJECTION)
    private readonly tenantUsers: TenantUserProjectionPort,
    @Inject(CONTRACT_DI_TOKEN.REPOSITORY)
    private readonly contracts: ContractRepository,
    @Inject(CONTRACT_DI_TOKEN.MEMBER_REPOSITORY)
    private readonly members: ContractMemberRepository,
    @Inject(UNIT_OF_WORK_DI_TOKEN) private readonly unitOfWork: IUnitOfWork,
    @Inject(OUTBOX_DI_TOKEN.REPOSITORY)
    private readonly outbox: OutboxRepository,
  ) {}

  execute(command: ContractMemberAddCommand): Promise<ContractMember> {
    return this.unitOfWork.run(async (context) => {
      const phone =
        command.input.tenantPhone === null
          ? null
          : TenantPhone.create(command.input.tenantPhone);
      if (phone !== null && command.input.tenantId === null) {
        await this.tenantUsers.lockPhone(phone, context);
      }
      const contract = await this.contracts.findByIdForUpdate(
        command.input.contractId,
        context,
      );
      if (!contract)
        throw new ContractNotFoundException(command.input.contractId);
      if (contract.landlordId !== command.landlordId)
        throw new ContractForbiddenException();
      if (contract.status !== ContractStatus.ACTIVE)
        throw new ContractNotActiveException();
      const tenantId =
        command.input.tenantId ??
        (phone === null
          ? null
          : await this.tenantUsers.findTenantIdByPhone(phone, context));
      const member = ContractMember.add({ ...command.input, tenantId });
      const joinedAt = member.joinedAt.getTime();
      if (
        joinedAt < new Date(contract.startDate).getTime() ||
        joinedAt > new Date(contract.endDate).getTime()
      ) {
        throw new ValidationException(
          'joinedAt must be within the contract dates',
        );
      }
      if (
        await this.members.existsActiveDuplicate(
          contract.id,
          {
            tenantId: member.tenantId,
            tenantPhone: member.tenantPhone?.value ?? null,
          },
          context,
        )
      ) {
        throw new MemberAlreadyExistsException();
      }
      await this.members.save(member, context);
      await this.outbox.append(
        member
          .pullDomainEvents()
          .map((event) => OutboxMessage.fromDomainEvent(event)),
        context,
      );
      return member;
    });
  }
}
