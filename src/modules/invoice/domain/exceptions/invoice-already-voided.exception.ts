import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class InvoiceAlreadyVoidedException extends DomainException {
  constructor() {
    super('Invoice is already void', 409, 'INVOICE_ALREADY_VOIDED');
  }
}
