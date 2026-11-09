import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export interface ContractHeadCountPort {
  countActiveMembers(
    contractId: Uuid,
    periodStart: string,
    periodEnd: string,
    context?: TransactionContext,
  ): Promise<number>;
}
