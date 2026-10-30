import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { BUILDING_DI_TOKEN } from '../../../building.di-token';
import { BuildingEntity } from '../../../domain/entities/building.entity';
import { BuildingRepository } from '../../../domain/repositories/building.repository';
import { BuildingSearchPublicQuery } from './building-search-public.query';

@QueryHandler(BuildingSearchPublicQuery)
export class BuildingSearchPublicQueryHandler implements IQueryHandler<
  BuildingSearchPublicQuery,
  PaginatedResult<BuildingEntity>
> {
  constructor(
    @Inject(BUILDING_DI_TOKEN.REPOSITORY)
    private readonly buildingRepository: BuildingRepository,
  ) {}

  execute(
    query: BuildingSearchPublicQuery,
  ): Promise<PaginatedResult<BuildingEntity>> {
    return this.buildingRepository.findPublicBuildings(query.options);
  }
}
