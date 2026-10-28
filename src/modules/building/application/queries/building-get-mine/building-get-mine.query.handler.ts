import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { BUILDING_DI_TOKEN } from '../../../building.di-token';
import { BuildingEntity } from '../../../domain/entities/building.entity';
import { BuildingNotFoundException } from '../../../domain/exceptions/building-not-found.exception';
import { BuildingRepository } from '../../../domain/repositories/building.repository';
import { BuildingGetMineQuery } from './building-get-mine.query';

@QueryHandler(BuildingGetMineQuery)
export class BuildingGetMineQueryHandler implements IQueryHandler<
  BuildingGetMineQuery,
  BuildingEntity
> {
  constructor(
    @Inject(BUILDING_DI_TOKEN.REPOSITORY)
    private readonly buildingRepository: BuildingRepository,
  ) {}

  async execute(query: BuildingGetMineQuery): Promise<BuildingEntity> {
    const building = await this.buildingRepository.findMyBuildingById(
      query.landlordId,
      query.buildingId,
    );
    if (!building) throw new BuildingNotFoundException(query.buildingId);
    return building;
  }
}
