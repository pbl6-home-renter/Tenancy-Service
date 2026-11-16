import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class SelfMatchingNotAllowedException extends DomainException {
  constructor() {
    super(
      'A tenant cannot send a match request to themselves',
      422,
      'SELF_MATCHING_NOT_ALLOWED',
    );
  }
}
