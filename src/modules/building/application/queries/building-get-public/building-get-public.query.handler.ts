import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { BUILDING_DI_TOKEN } from '../../../building.di-token';
import { BuildingEntity } from '../../../domain/entities/building.entity';
import { BuildingNotFoundException } from '../../../domain/exceptions/building-not-found.exception';
import { BuildingRepository } from '../../../domain/repositories/building.repository';
import { BuildingGetPublicQuery } from './building-get-public.query';

@QueryHandler(BuildingGetPublicQuery)
export class BuildingGetPublicQueryHandler implements IQueryHandler<
  BuildingGetPublicQuery,
  BuildingEntity
> {
  constructor(
    @Inject(BUILDING_DI_TOKEN.REPOSITORY)
    private readonly buildingRepository: BuildingRepository,
  ) {}

  async execute(query: BuildingGetPublicQuery): Promise<BuildingEntity> {
    const building = await this.buildingRepository.findPublicBuildingById(
      query.buildingId,
    );
    if (!building) throw new BuildingNotFoundException(query.buildingId);
    return building;
  }
}
