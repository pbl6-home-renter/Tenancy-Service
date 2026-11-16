import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { MatchRequestEntity } from '../entities/match-request.entity';

export interface MatchRequestRepository {
  findByRequestKey(
    requesterId: Uuid,
    key: Uuid,
  ): Promise<MatchRequestEntity | null>;
  insertOrFind(
    request: MatchRequestEntity,
    context: TransactionContext,
  ): Promise<{ request: MatchRequestEntity; created: boolean }>;
  findByIdForUpdate(
    id: Uuid,
    context: TransactionContext,
  ): Promise<MatchRequestEntity | null>;
  save(request: MatchRequestEntity, context: TransactionContext): Promise<void>;
}
