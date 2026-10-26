import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class ApprovedBuildingLockedException extends DomainException {
  constructor(id: string) {
    super(
      `Approved building "${id}" cannot be updated`,
      409,
      'APPROVED_BUILDING_LOCKED',
    );
  }
}
