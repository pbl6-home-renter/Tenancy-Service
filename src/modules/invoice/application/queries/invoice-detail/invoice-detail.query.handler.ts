import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { INVOICE_DI_TOKEN } from '../../../invoice.di-token';
import { InvoiceForbiddenException } from '../../../domain/exceptions/invoice-forbidden.exception';
import { InvoiceNotFoundException } from '../../../domain/exceptions/invoice-not-found.exception';
import {
  InvoiceDetailView,
  InvoiceReadPort,
} from '../../ports/invoice-read.port';
import { InvoiceDetailQuery } from './invoice-detail.query';

@QueryHandler(InvoiceDetailQuery)
export class InvoiceDetailQueryHandler implements IQueryHandler<
  InvoiceDetailQuery,
  InvoiceDetailView
> {
  constructor(
    @Inject(INVOICE_DI_TOKEN.READ)
    private readonly invoices: InvoiceReadPort,
  ) {}

  async execute(query: InvoiceDetailQuery): Promise<InvoiceDetailView> {
    const view = await this.invoices.findById(query.invoiceId);
    if (!view) throw new InvoiceNotFoundException();
    if (view.landlordId !== query.landlordId)
      throw new InvoiceForbiddenException();
    return view;
  }
}
