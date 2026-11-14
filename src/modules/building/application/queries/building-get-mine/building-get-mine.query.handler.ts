import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { BUILDING_DI_TOKEN } from '../../../building.di-token';
import {
  BuildingRoomStatsReader,
  BuildingWithStats,
  emptyBuildingRoomStats,
} from '../../ports/building-room-stats.port';
import { BuildingNotFoundException } from '../../../domain/exceptions/building-not-found.exception';
import { BuildingRepository } from '../../../domain/repositories/building.repository';
import { BuildingGetMineQuery } from './building-get-mine.query';

@QueryHandler(BuildingGetMineQuery)
export class BuildingGetMineQueryHandler implements IQueryHandler<
  BuildingGetMineQuery,
  BuildingWithStats
> {
  constructor(
    @Inject(BUILDING_DI_TOKEN.REPOSITORY)
    private readonly buildingRepository: BuildingRepository,
    @Inject(BUILDING_DI_TOKEN.ROOM_STATS)
    private readonly roomStats: BuildingRoomStatsReader,
  ) {}

  async execute(query: BuildingGetMineQuery): Promise<BuildingWithStats> {
    const building = await this.buildingRepository.findMyBuildingById(
      query.landlordId,
      query.buildingId,
    );
    if (!building) throw new BuildingNotFoundException(query.buildingId);
    const stats = await this.roomStats.getStats([building.id]);
    return {
      building,
      stats: stats.get(building.id) ?? emptyBuildingRoomStats(),
    };
  }
}
