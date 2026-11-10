import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { INBOX_DI_TOKEN } from 'modules/inbox/inbox.di-token';
import { InboxRepository } from 'modules/inbox/application/ports/inbox.repository';
import { OutboxMessage } from 'modules/outbox/domain/entities/outbox-message.entity';
import { OutboxRepository } from 'modules/outbox/domain/repositories/outbox.repository';
import { OUTBOX_DI_TOKEN } from 'modules/outbox/outbox.di-token';
import { UNIT_OF_WORK_DI_TOKEN } from 'shared/application/di-tokens';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { UserRole } from 'shared/domain/enums/user-role.enum';
import { UserStatus } from 'shared/domain/enums/user-status.enum';
import { CONTRACT_DI_TOKEN } from '../../../contract.di-token';
import { ContractRepository } from '../../../domain/repositories/contract.repository';
import { ContractMemberRepository } from '../../../domain/repositories/contract-member.repository';
import { TenantAccountLinkCommand } from './tenant-account-link.command';

@CommandHandler(TenantAccountLinkCommand)
export class TenantAccountLinkCommandHandler implements ICommandHandler<
  TenantAccountLinkCommand,
  void
> {
  constructor(
    @Inject(CONTRACT_DI_TOKEN.REPOSITORY)
    private readonly contracts: ContractRepository,
    @Inject(CONTRACT_DI_TOKEN.MEMBER_REPOSITORY)
    private readonly members: ContractMemberRepository,
    @Inject(INBOX_DI_TOKEN.REPOSITORY)
    private readonly inbox: InboxRepository,
    @Inject(OUTBOX_DI_TOKEN.REPOSITORY)
    private readonly outbox: OutboxRepository,
    @Inject(UNIT_OF_WORK_DI_TOKEN)
    private readonly unitOfWork: IUnitOfWork,
  ) {}

  execute(command: TenantAccountLinkCommand): Promise<void> {
    return this.unitOfWork.run(async (context) => {
      const isNew = await this.inbox.recordIfNew(
        command.eventId,
        command.eventType,
        context,
      );
      if (!isNew) return;
      if (
        command.role !== UserRole.TENANT ||
        command.status !== UserStatus.ACTIVE
      )
        return;

      const contracts = await this.contracts.findUnlinkedByPhoneForUpdate(
        command.phone,
        context,
      );
      for (const contract of contracts) {
        if (contract.linkTenant(command.userId, command.phone)) {
          await this.contracts.save(contract, context);
        }
        const members = await this.members.findUnlinkedByPhoneForUpdate(
          contract.id,
          command.phone,
          context,
        );
        for (const member of members) {
          if (!member.linkTenant(command.userId, command.phone)) continue;
          await this.members.save(member, context);
          await this.outbox.append(
            member
              .pullDomainEvents()
              .map((event) => OutboxMessage.fromDomainEvent(event)),
            context,
          );
        }
      }
    });
  }
}
