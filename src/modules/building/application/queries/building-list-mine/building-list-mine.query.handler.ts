import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { BUILDING_DI_TOKEN } from '../../../building.di-token';
import { BuildingEntity } from '../../../domain/entities/building.entity';
import { BuildingRepository } from '../../../domain/repositories/building.repository';
import { BuildingListMineQuery } from './building-list-mine.query';

@QueryHandler(BuildingListMineQuery)
export class BuildingListMineQueryHandler implements IQueryHandler<
  BuildingListMineQuery,
  PaginatedResult<BuildingEntity>
> {
  constructor(
    @Inject(BUILDING_DI_TOKEN.REPOSITORY)
    private readonly buildingRepository: BuildingRepository,
  ) {}

  execute(
    query: BuildingListMineQuery,
  ): Promise<PaginatedResult<BuildingEntity>> {
    return this.buildingRepository.findMyBuildings(
      query.landlordId,
      query.options,
    );
  }
}
