import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class LeftDateInvalidException extends DomainException {
  constructor() {
    super(
      'Leave date must be on or after joinedAt and within the contract dates',
      422,
      'LEFT_DATE_INVALID',
    );
  }
}
