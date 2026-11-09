import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class InvoiceForbiddenException extends DomainException {
  constructor() {
    super('Invoice does not belong to this landlord', 403, 'FORBIDDEN');
  }
}
