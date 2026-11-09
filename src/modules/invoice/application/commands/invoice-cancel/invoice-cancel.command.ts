import { ICommand } from '@nestjs/cqrs';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export class InvoiceCancelCommand implements ICommand {
  constructor(
    readonly invoiceId: Uuid,
    readonly landlordId: Uuid,
    readonly reason: string,
  ) {}
}
