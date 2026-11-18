import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class MatchRequestParticipantUnavailableException extends DomainException {
  constructor() {
    super(
      'A match request participant is unavailable',
      404,
      'MATCH_REQUEST_PARTICIPANT_UNAVAILABLE',
    );
  }
}
