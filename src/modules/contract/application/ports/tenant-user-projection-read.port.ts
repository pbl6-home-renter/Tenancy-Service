import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

/** Presence means an active tenant lifecycle snapshot has been projected. */
export interface TenantUserProjectionReadPort {
  existsByUserId(userId: Uuid, context: TransactionContext): Promise<boolean>;
}
