import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class InvoiceIdsRequiredException extends DomainException {
  constructor() {
    super(
      'invoiceIds must contain at least one item',
      422,
      'INVOICE_IDS_REQUIRED',
    );
  }
}
