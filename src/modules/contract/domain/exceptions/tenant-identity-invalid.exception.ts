import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class TenantIdentityInvalidException extends DomainException {
  constructor() {
    super(
      'An unlinked tenant must have a name and phone number',
      422,
      'TENANT_IDENTITY_INVALID',
    );
  }
}
