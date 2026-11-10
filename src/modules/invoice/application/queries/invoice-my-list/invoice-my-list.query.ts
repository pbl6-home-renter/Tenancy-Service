import { IQuery } from '@nestjs/cqrs';
import { OffsetPageQuery } from 'shared/application/pagination/offset-page-query';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { InvoiceMyListFilter } from '../../ports/invoice-read.port';

export class InvoiceMyListQuery implements IQuery {
  constructor(
    readonly tenantId: Uuid,
    readonly options: OffsetPageQuery<InvoiceMyListFilter>,
  ) {}
}
