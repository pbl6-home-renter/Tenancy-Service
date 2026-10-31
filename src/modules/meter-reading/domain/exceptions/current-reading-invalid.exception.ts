import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class CurrentReadingInvalidException extends DomainException {
  constructor() {
    super(
      'Current reading cannot be below previous reading',
      422,
      'CURRENT_READING_INVALID',
    );
  }
}
