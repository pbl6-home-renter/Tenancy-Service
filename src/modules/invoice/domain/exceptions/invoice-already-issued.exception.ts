import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class InvoiceAlreadyIssuedException extends DomainException {
  constructor() {
    super('Issued invoice cannot be modified', 409, 'INVOICE_ALREADY_ISSUED');
  }
}
