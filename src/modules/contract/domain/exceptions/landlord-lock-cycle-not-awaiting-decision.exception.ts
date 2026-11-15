import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class LandlordLockCycleNotAwaitingDecisionException extends DomainException {
  constructor() {
    super(
      'Landlord lock cycle is not awaiting a decision',
      409,
      'LANDLORD_LOCK_CYCLE_NOT_AWAITING_DECISION',
    );
  }
}
