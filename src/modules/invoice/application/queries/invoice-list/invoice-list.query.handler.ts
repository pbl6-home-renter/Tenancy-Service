import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { INVOICE_DI_TOKEN } from '../../../invoice.di-token';
import {
  InvoiceListView,
  InvoiceReadPort,
} from '../../ports/invoice-read.port';
import { InvoiceListQuery } from './invoice-list.query';

@QueryHandler(InvoiceListQuery)
export class InvoiceListQueryHandler implements IQueryHandler<
  InvoiceListQuery,
  PaginatedResult<InvoiceListView>
> {
  constructor(
    @Inject(INVOICE_DI_TOKEN.READ)
    private readonly invoices: InvoiceReadPort,
  ) {}

  execute(query: InvoiceListQuery): Promise<PaginatedResult<InvoiceListView>> {
    return this.invoices.findPage(query.landlordId, query.options);
  }
}
