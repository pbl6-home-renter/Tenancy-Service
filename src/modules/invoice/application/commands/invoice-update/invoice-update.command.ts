import { ICommand } from '@nestjs/cqrs';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { InvoiceOtherFee } from '../../../domain/entities/invoice.props';

export class InvoiceUpdateCommand implements ICommand {
  constructor(
    readonly invoiceId: Uuid,
    readonly landlordId: Uuid,
    readonly otherFees?: InvoiceOtherFee[],
    readonly note?: string | null,
  ) {}
}
