import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { INVOICE_DI_TOKEN } from '../../../invoice.di-token';
import {
  InvoiceMyListView,
  InvoiceReadPort,
} from '../../ports/invoice-read.port';
import { InvoiceMyListQuery } from './invoice-my-list.query';

@QueryHandler(InvoiceMyListQuery)
export class InvoiceMyListQueryHandler implements IQueryHandler<
  InvoiceMyListQuery,
  PaginatedResult<InvoiceMyListView>
> {
  constructor(
    @Inject(INVOICE_DI_TOKEN.READ)
    private readonly invoices: InvoiceReadPort,
  ) {}

  execute(
    query: InvoiceMyListQuery,
  ): Promise<PaginatedResult<InvoiceMyListView>> {
    return this.invoices.findPageByTenant(query.tenantId, query.options);
  }
}
