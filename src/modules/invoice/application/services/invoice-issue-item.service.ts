import { Inject, Injectable } from '@nestjs/common';
import { UNIT_OF_WORK_DI_TOKEN } from 'shared/application/di-tokens';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { CONTRACT_DI_TOKEN } from 'modules/contract/contract.di-token';
import { ContractMemberRepository } from 'modules/contract/domain/repositories/contract-member.repository';
import { INVOICE_DI_TOKEN } from '../../invoice.di-token';
import { InvoiceEntity } from '../../domain/entities/invoice.entity';
import { InvoiceStatus } from '../../domain/enums/invoice-status.enum';
import { InvoiceNotificationRequestedEvent } from '../../domain/events/invoice-notification-requested.event';
import { InvoiceRepository } from '../../domain/repositories/invoice.repository';
import {
  InvoiceIssueFailed,
  InvoiceIssueSucceeded,
} from '../commands/invoice-issue/invoice-issue.result';
import { InvoicePersistenceService } from './invoice-persistence.service';
import { InvoiceOwnershipService } from './invoice-ownership.service';

@Injectable()
export class InvoiceIssueItemService {
  constructor(
    @Inject(INVOICE_DI_TOKEN.REPOSITORY)
    private readonly invoices: InvoiceRepository,
    @Inject(UNIT_OF_WORK_DI_TOKEN)
    private readonly unitOfWork: IUnitOfWork,
    private readonly persistence: InvoicePersistenceService,
    private readonly ownership: InvoiceOwnershipService,
    @Inject(CONTRACT_DI_TOKEN.MEMBER_REPOSITORY)
    private readonly members: ContractMemberRepository,
  ) {}
  issue(
    invoiceId: Uuid,
    landlordId: Uuid,
  ): Promise<InvoiceIssueSucceeded | InvoiceIssueFailed> {
    return this.unitOfWork.run(async (context) => {
      const invoice = await this.invoices.findByIdForUpdate(invoiceId, context);
      if (!invoice) return { invoiceId, code: 'INVOICE_NOT_FOUND' };
      if (
        !(await this.ownership.isOwnedByLandlord(invoice, landlordId, context))
      )
        return { invoiceId, code: 'FORBIDDEN' };
      if (invoice.status !== InvoiceStatus.PENDING)
        return { invoiceId, code: 'INVOICE_NOT_PENDING' };
      invoice.issue();
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
              member.tenantId === null ? [] : [member.tenantId],
            ),
        ),
      ];
      const notificationEvents =
        recipientUserIds.length === 0
          ? []
          : [
              new InvoiceNotificationRequestedEvent(
                invoice.id,
                invoice.contractId,
                invoice.period.value,
                recipientUserIds,
                invoice.issuedAt!,
              ),
            ];
      await this.persistence.saveWithEvents(
        invoice,
        context,
        notificationEvents,
      );
      return this.toIssuedResult(invoice);
    });
  }

  private toIssuedResult(invoice: InvoiceEntity): InvoiceIssueSucceeded {
    return {
      id: invoice.id,
      code: invoice.code.value,
      invoiceStatus: InvoiceStatus.ISSUED,
      issuedAt: invoice.issuedAt!.toISOString(),
    };
  }
}
