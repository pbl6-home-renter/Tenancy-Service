import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class InvoiceNotFoundException extends DomainException {
  constructor() {
    super('Invoice not found', 404, 'INVOICE_NOT_FOUND');
  }
}
