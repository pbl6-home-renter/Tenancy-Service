import { BaseRepository } from 'shared/domain/repositories/base.repository';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { OffsetPageQuery } from 'shared/application/pagination/offset-page-query';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { BuildingEntity } from '../entities/building.entity';
import { BuildingStatus } from '../enums/building-status.enum';

export type MyBuildingFilter = {
  status?: BuildingStatus;
};

export interface BuildingRepository extends BaseRepository<BuildingEntity> {
  findMyBuildings(
    landlordId: Uuid,
    query: OffsetPageQuery<MyBuildingFilter>,
  ): Promise<PaginatedResult<BuildingEntity>>;
  findMyBuildingById(
    landlordId: Uuid,
    id: Uuid,
  ): Promise<BuildingEntity | null>;
  findById(
    id: Uuid,
    context?: TransactionContext,
  ): Promise<BuildingEntity | null>;
  findByIdForUpdate(
    id: Uuid,
    context: TransactionContext,
  ): Promise<BuildingEntity | null>;
}
