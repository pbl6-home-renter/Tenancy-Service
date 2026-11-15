import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class ContractLockDecisionConflictException extends DomainException {
  constructor() {
    super(
      'A different contract lock decision is already recorded',
      409,
      'CONTRACT_LOCK_DECISION_CONFLICT',
    );
  }
}
