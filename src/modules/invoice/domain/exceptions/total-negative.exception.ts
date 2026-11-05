import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class TotalNegativeException extends DomainException {
  constructor() {
    super('Invoice total cannot be negative', 422, 'TOTAL_NEGATIVE');
  }
}
