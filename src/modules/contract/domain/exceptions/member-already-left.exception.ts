import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class MemberAlreadyLeftException extends DomainException {
  constructor() {
    super('Member leave has already been recorded', 409, 'MEMBER_ALREADY_LEFT');
  }
}
