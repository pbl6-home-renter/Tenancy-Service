import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { BUILDING_DI_TOKEN } from '../../../building.di-token';
import {
  BuildingRoomStatsReader,
  BuildingWithStats,
  emptyBuildingRoomStats,
} from '../../ports/building-room-stats.port';
import { BuildingRepository } from '../../../domain/repositories/building.repository';
import { BuildingListMineQuery } from './building-list-mine.query';

@QueryHandler(BuildingListMineQuery)
export class BuildingListMineQueryHandler implements IQueryHandler<
  BuildingListMineQuery,
  PaginatedResult<BuildingWithStats>
> {
  constructor(
    @Inject(BUILDING_DI_TOKEN.REPOSITORY)
    private readonly buildingRepository: BuildingRepository,
    @Inject(BUILDING_DI_TOKEN.ROOM_STATS)
    private readonly roomStats: BuildingRoomStatsReader,
  ) {}

  async execute(
    query: BuildingListMineQuery,
  ): Promise<PaginatedResult<BuildingWithStats>> {
    const page = await this.buildingRepository.findMyBuildings(
      query.landlordId,
      query.options,
    );
    const stats = await this.roomStats.getStats(
      page.data.map((building) => building.id),
    );
    return {
      ...page,
      data: page.data.map((building) => ({
        building,
        stats: stats.get(building.id) ?? emptyBuildingRoomStats(),
      })),
    };
  }
}
