import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class PeriodAlreadyInvoicedException extends DomainException {
  constructor() {
    super(
      'Meter reading period already has an issued invoice',
      409,
      'PERIOD_ALREADY_INVOICED',
    );
  }
}
