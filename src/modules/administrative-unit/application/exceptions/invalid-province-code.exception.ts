import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class InvalidProvinceCodeException extends DomainException {
  constructor() {
    super(
      'Province code must contain one or two digits.',
      422,
      'INVALID_PROVINCE_CODE',
    );
  }
}
