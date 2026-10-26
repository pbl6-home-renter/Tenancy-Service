import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class ProvinceNotFoundException extends DomainException {
  constructor(provinceCode: string) {
    super(`Province ${provinceCode} was not found.`, 404, 'PROVINCE_NOT_FOUND');
  }
}
