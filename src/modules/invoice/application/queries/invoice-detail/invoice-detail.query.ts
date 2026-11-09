import { IQuery } from '@nestjs/cqrs';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export class InvoiceDetailQuery implements IQuery {
  constructor(
    readonly invoiceId: Uuid,
    readonly landlordId: Uuid,
  ) {}
}
