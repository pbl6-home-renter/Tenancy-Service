import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class PolicyNotActiveException extends DomainException {
  constructor() {
    super('Rate policy is already inactive', 409, 'POLICY_NOT_ACTIVE');
  }
}
