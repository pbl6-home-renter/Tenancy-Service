import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UNIT_OF_WORK_DI_TOKEN } from 'shared/application/di-tokens';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { CONTRACT_DI_TOKEN } from 'modules/contract/contract.di-token';
import { ContractMemberRepository } from 'modules/contract/domain/repositories/contract-member.repository';
import { INVOICE_DI_TOKEN } from '../../../invoice.di-token';
import { InvoiceEntity } from '../../../domain/entities/invoice.entity';
import { InvoiceStatus } from '../../../domain/enums/invoice-status.enum';
import { InvoiceVoidedNotificationRequestedEvent } from '../../../domain/events/invoice-voided-notification-requested.event';
import { InvoiceNotFoundException } from '../../../domain/exceptions/invoice-not-found.exception';
import { InvoiceRepository } from '../../../domain/repositories/invoice.repository';
import { InvoiceOwnershipService } from '../../services/invoice-ownership.service';
import { InvoicePersistenceService } from '../../services/invoice-persistence.service';
import { InvoiceCancelCommand } from './invoice-cancel.command';

@CommandHandler(InvoiceCancelCommand)
export class InvoiceCancelCommandHandler implements ICommandHandler<
  InvoiceCancelCommand,
  InvoiceEntity
> {
  constructor(
    @Inject(INVOICE_DI_TOKEN.REPOSITORY)
    private readonly invoices: InvoiceRepository,
    @Inject(UNIT_OF_WORK_DI_TOKEN)
    private readonly unitOfWork: IUnitOfWork,
    private readonly ownership: InvoiceOwnershipService,
    private readonly persistence: InvoicePersistenceService,
    @Inject(CONTRACT_DI_TOKEN.MEMBER_REPOSITORY)
    private readonly members: ContractMemberRepository,
  ) {}

  execute(command: InvoiceCancelCommand): Promise<InvoiceEntity> {
    return this.unitOfWork.run(async (context) => {
      const invoice = await this.invoices.findByIdForUpdate(
        command.invoiceId,
        context,
      );
      if (!invoice) throw new InvoiceNotFoundException();
      await this.ownership.assertLandlord(invoice, command.landlordId, context);
      const previousStatus = invoice.status;
      invoice.void(command.reason);
      const notificationEvents: InvoiceVoidedNotificationRequestedEvent[] = [];
      if (previousStatus === InvoiceStatus.ISSUED) {
        const activeMembers = await this.members.findActiveByContractAt(
          invoice.contractId,
          invoice.issuedAt!,
          context,
        );
        const recipientUserIds = [
          ...new Set(
            activeMembers
              .filter(
                (member) =>
                  member.joinedAt <= invoice.issuedAt! &&
                  member.isActive(invoice.issuedAt!),
              )
              .flatMap((member) =>
                member.tenantId === null ||
                member.tenantId === command.landlordId
                  ? []
                  : [member.tenantId],
              ),
          ),
        ];
        if (recipientUserIds.length > 0)
          notificationEvents.push(
            new InvoiceVoidedNotificationRequestedEvent(
              invoice.id,
              invoice.contractId,
              invoice.period.value,
              invoice.voidReason!,
              recipientUserIds,
              new Date(),
            ),
          );
      }
      await this.persistence.saveWithEvents(
        invoice,
        context,
        notificationEvents,
      );
      return invoice;
    });
  }
}
