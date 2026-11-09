import { ICommand } from '@nestjs/cqrs';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export class InvoiceIssueCommand implements ICommand {
  constructor(
    readonly landlordId: Uuid,
    readonly key: Uuid,
    readonly invoiceIds: Uuid[],
  ) {}
}
