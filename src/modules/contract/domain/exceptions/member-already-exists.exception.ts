import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class MemberAlreadyExistsException extends DomainException {
  constructor() {
    super(
      'An active member already has this tenant ID or phone number',
      409,
      'MEMBER_ALREADY_EXISTS',
    );
  }
}
