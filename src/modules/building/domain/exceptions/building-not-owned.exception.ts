import { DomainException } from 'shared/domain/exceptions/domain.exception';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export class BuildingNotOwnedException extends DomainException {
  constructor(buildingId: Uuid, landlordId: Uuid) {
    super(
      `Building "${buildingId}" does not belong to landlord "${landlordId}"`,
      403,
      'FORBIDDEN',
    );
  }
}
