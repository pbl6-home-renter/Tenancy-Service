import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class RatePoliciesRequiredException extends DomainException {
  constructor() {
    super('At least one rate is required', 422, 'RATE_POLICIES_REQUIRED');
  }
}
