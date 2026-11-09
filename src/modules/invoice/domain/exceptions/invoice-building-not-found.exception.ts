import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class InvoiceBuildingNotFoundException extends DomainException {
  constructor(id: string) {
    super(`Building "${id}" not found`, 404, 'BUILDING_NOT_FOUND');
  }
}
