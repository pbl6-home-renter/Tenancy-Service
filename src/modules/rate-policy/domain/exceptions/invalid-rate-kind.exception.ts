import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class InvalidRateKindException extends DomainException {
  constructor() {
    super(
      'Rate kind is not valid for this rate type',
      422,
      'INVALID_RATE_KIND',
    );
  }
}
