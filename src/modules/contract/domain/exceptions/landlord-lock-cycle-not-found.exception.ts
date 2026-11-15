import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class LandlordLockCycleNotFoundException extends DomainException {
  constructor() {
    super(
      'Landlord lock cycle not found',
      404,
      'LANDLORD_LOCK_CYCLE_NOT_FOUND',
    );
  }
}
