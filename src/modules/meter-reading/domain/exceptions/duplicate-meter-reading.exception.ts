import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class DuplicateMeterReadingException extends DomainException {
  constructor() {
    super(
      'A reading already exists for this room, type and period',
      409,
      'DUPLICATE_METER_READING',
    );
  }
}
