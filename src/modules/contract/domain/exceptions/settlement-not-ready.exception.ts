import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class SettlementNotReadyException extends DomainException {
  constructor() {
    super(
      'The checkout period must have an issued invoice and no pending invoice',
      409,
      'SETTLEMENT_NOT_READY',
    );
  }
}
