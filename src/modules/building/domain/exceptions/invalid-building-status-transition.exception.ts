import { DomainException } from 'shared/domain/exceptions/domain.exception';
import { BuildingStatus } from '../enums/building-status.enum';

export class InvalidBuildingStatusTransitionException extends DomainException {
  constructor(id: string, from: BuildingStatus, to: BuildingStatus) {
    super(
      `Building "${id}" cannot move from ${from} to ${to}`,
      409,
      'BUILDING_NOT_PENDING',
    );
  }
}
