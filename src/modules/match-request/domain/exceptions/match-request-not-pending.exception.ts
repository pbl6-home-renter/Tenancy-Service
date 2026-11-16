import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class MatchRequestNotPendingException extends DomainException {
  constructor() {
    super(
      'Match request is no longer pending',
      409,
      'MATCH_REQUEST_NOT_PENDING',
    );
  }
}
