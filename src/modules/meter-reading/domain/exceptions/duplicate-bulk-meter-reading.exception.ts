import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class DuplicateBulkMeterReadingException extends DomainException {
  constructor() {
    super('A submitted meter reading is duplicated', 409, 'DUPLICATE_READING');
  }
}
