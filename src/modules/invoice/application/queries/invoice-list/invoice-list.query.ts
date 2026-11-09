import { IQuery } from '@nestjs/cqrs';
import { OffsetPageQuery } from 'shared/application/pagination/offset-page-query';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { InvoiceListFilter } from '../../ports/invoice-read.port';

export class InvoiceListQuery implements IQuery {
  constructor(
    readonly landlordId: Uuid,
    readonly options: OffsetPageQuery<InvoiceListFilter>,
  ) {}
}
