import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export interface ContractSettlementPort {
  isPeriodSettled(
    contractId: Uuid,
    period: string,
    context: TransactionContext,
  ): Promise<boolean>;
}
