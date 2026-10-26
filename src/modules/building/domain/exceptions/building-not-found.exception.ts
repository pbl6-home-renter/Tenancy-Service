import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class BuildingNotFoundException extends DomainException {
  constructor(id: string) {
    super(`Building "${id}" not found`, 404, 'RESOURCE_NOT_FOUND');
  }
}
