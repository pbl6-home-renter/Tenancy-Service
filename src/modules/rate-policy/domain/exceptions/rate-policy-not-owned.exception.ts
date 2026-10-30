import { DomainException } from 'shared/domain/exceptions/domain.exception';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export class RatePolicyNotOwnedException extends DomainException {
  constructor(policyId: Uuid, landlordId: Uuid) {
    super(
      `Rate policy "${policyId}" does not belong to landlord "${landlordId}"`,
      403,
      'FORBIDDEN',
    );
  }
}
