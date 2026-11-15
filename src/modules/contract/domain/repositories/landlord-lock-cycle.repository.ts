import { BaseRepository } from 'shared/domain/repositories/base.repository';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { LandlordLockCycleEntity } from '../entities/landlord-lock-cycle.entity';

export interface LandlordLockCycleRepository extends BaseRepository<LandlordLockCycleEntity> {
  findById(
    id: Uuid,
    context?: TransactionContext,
  ): Promise<LandlordLockCycleEntity | null>;
  lockLandlord(landlordId: Uuid, context: TransactionContext): Promise<void>;
  findLatestForUpdate(
    landlordId: Uuid,
    context: TransactionContext,
  ): Promise<LandlordLockCycleEntity | null>;
}
