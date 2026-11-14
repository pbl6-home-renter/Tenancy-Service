import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

/** Read-only check used before deleting a room (P2-D50). */
export interface RoomActiveContractCheckerPort {
  hasActiveContract(
    roomId: Uuid,
    context?: TransactionContext,
  ): Promise<boolean>;
}
