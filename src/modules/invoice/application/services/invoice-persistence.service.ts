import { Inject, Injectable } from '@nestjs/common';
import { OUTBOX_DI_TOKEN } from 'modules/outbox/outbox.di-token';
import { OutboxMessage } from 'modules/outbox/domain/entities/outbox-message.entity';
import { OutboxRepository } from 'modules/outbox/domain/repositories/outbox.repository';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { INVOICE_DI_TOKEN } from '../../invoice.di-token';
import { InvoiceEntity } from '../../domain/entities/invoice.entity';
import { InvoiceRepository } from '../../domain/repositories/invoice.repository';

@Injectable()
export class InvoicePersistenceService {
  constructor(
    @Inject(INVOICE_DI_TOKEN.REPOSITORY)
    private readonly invoices: InvoiceRepository,
    @Inject(OUTBOX_DI_TOKEN.REPOSITORY)
    private readonly outbox: OutboxRepository,
  ) {}

  async saveWithEvents(
    invoice: InvoiceEntity,
    context: TransactionContext,
  ): Promise<void> {
    await this.invoices.save(invoice, context);
    await this.outbox.append(
      invoice
        .pullDomainEvents()
        .map((event) => OutboxMessage.fromDomainEvent(event)),
      context,
    );
  }
}
