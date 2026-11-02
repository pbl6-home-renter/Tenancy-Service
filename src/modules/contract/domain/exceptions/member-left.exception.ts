import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class MemberLeftException extends DomainException {
  constructor() {
    super('Member has already left', 409, 'MEMBER_LEFT');
  }
}
