import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export const LANDLORD_LOCK = Symbol('LANDLORD_LOCK');

export interface LandlordLockPort {
  setState(
    userId: Uuid,
    lockedAt: Date,
    isLocked: boolean,
    context?: TransactionContext,
  ): Promise<void>;
  isLocked(userId: Uuid): Promise<boolean>;
}
