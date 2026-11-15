import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class ContractLockDecisionInvalidException extends DomainException {
  constructor() {
    super(
      'Contract is not suspended in this lock cycle',
      409,
      'CONTRACT_LOCK_DECISION_INVALID',
    );
  }
}
