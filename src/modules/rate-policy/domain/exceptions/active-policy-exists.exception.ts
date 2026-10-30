import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class ActivePolicyExistsException extends DomainException {
  constructor() {
    super(
      'A rate policy already exists for this target',
      409,
      'ACTIVE_POLICY_EXISTS',
    );
  }
}
