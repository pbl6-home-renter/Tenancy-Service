import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class ContractNotActiveException extends DomainException {
  constructor() {
    super('Contract is not active', 409, 'CONTRACT_NOT_ACTIVE');
  }
}
