import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class InvoiceIdsTooLargeException extends DomainException {
  constructor() {
    super(
      'invoiceIds must contain at most 100 items',
      422,
      'INVOICE_IDS_TOO_LARGE',
    );
  }
}
