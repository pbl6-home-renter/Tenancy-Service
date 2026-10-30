import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class RatePolicyBuildingNotFoundException extends DomainException {
  constructor(id: string) {
    super(`Building "${id}" not found`, 404, 'BUILDING_NOT_FOUND');
  }
}
