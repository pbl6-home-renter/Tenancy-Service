import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class InvoiceNotPendingException extends DomainException {
  constructor() {
    super('Only a pending invoice can be issued', 409, 'INVOICE_NOT_PENDING');
  }
}
