import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class MatchRequestNotFoundException extends DomainException {
  constructor() {
    super('Match request not found', 404, 'MATCH_REQUEST_NOT_FOUND');
  }
}
