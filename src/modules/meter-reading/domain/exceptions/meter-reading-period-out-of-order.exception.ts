import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class MeterReadingPeriodOutOfOrderException extends DomainException {
  constructor() {
    super(
      'Meter readings must be recorded in increasing period order',
      422,
      'METER_READING_PERIOD_OUT_OF_ORDER',
    );
  }
}
