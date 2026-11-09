import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class MeterReadingNotLatestException extends DomainException {
  constructor() {
    super(
      'Only the latest meter reading can be updated',
      409,
      'METER_READING_NOT_LATEST',
    );
  }
}
