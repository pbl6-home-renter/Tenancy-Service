import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class MatchRequestDuplicateException extends DomainException {
  constructor() {
    super(
      'A pending request already exists for this pair',
      409,
      'DUPLICATE_MATCH_REQUEST',
    );
  }
}
