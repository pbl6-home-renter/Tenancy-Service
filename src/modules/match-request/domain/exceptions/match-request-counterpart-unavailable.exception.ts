import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class MatchRequestCounterpartUnavailableException extends DomainException {
  constructor() {
    super(
      'The other tenant account is unavailable',
      409,
      'MATCH_REQUEST_COUNTERPART_UNAVAILABLE',
    );
  }
}
