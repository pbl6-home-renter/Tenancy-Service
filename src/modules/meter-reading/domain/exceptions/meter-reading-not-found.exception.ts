import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class MeterReadingNotFoundException extends DomainException {
  constructor() {
    super('Meter reading not found', 404, 'RESOURCE_NOT_FOUND');
  }
}
