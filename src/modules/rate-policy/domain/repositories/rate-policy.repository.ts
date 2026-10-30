import { BaseRepository } from 'shared/domain/repositories/base.repository';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { RatePolicyEntity } from '../entities/rate-policy.entity';

export interface RatePolicyRepository extends BaseRepository<RatePolicyEntity> {
  findById(
    id: Uuid,
    context?: TransactionContext,
  ): Promise<RatePolicyEntity | null>;
  findByIdForUpdate(
    id: Uuid,
    context: TransactionContext,
  ): Promise<RatePolicyEntity | null>;
  findByBuilding(
    buildingId: Uuid,
    context?: TransactionContext,
  ): Promise<RatePolicyEntity | null>;
  findByRoom(
    roomId: Uuid,
    context?: TransactionContext,
  ): Promise<RatePolicyEntity | null>;
}
