import { BaseRepository } from 'shared/domain/repositories/base.repository';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { BuildingEntity } from '../entities/building.entity';

export interface BuildingRepository extends BaseRepository<BuildingEntity> {
  findById(
    id: Uuid,
    context?: TransactionContext,
  ): Promise<BuildingEntity | null>;
  findByIdForUpdate(
    id: Uuid,
    context: TransactionContext,
  ): Promise<BuildingEntity | null>;
}
