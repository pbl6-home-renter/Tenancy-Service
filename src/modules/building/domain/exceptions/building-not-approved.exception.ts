import { DomainException } from 'shared/domain/exceptions/domain.exception';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export class BuildingNotApprovedException extends DomainException {
  constructor(buildingId: Uuid) {
    super(
      `Building "${buildingId}" is not approved`,
      422,
      'BUILDING_NOT_APPROVED',
    );
  }
}
