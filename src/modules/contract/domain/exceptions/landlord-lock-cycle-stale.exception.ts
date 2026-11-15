import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class LandlordLockCycleStaleException extends DomainException {
  constructor() {
    super(
      'Landlord lock cycle has been superseded',
      409,
      'LANDLORD_LOCK_CYCLE_STALE',
    );
  }
}
