import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class MatchRequestForbiddenException extends DomainException {
  constructor() {
    super('Actor cannot act on this match request', 403, 'FORBIDDEN');
  }
}
