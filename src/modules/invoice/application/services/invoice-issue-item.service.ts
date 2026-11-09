import { Inject, Injectable } from '@nestjs/common';
import { UNIT_OF_WORK_DI_TOKEN } from 'shared/application/di-tokens';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { INVOICE_DI_TOKEN } from '../../invoice.di-token';
import { InvoiceEntity } from '../../domain/entities/invoice.entity';
import { InvoiceStatus } from '../../domain/enums/invoice-status.enum';
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
      await this.persistence.saveWithEvents(invoice, context);
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
