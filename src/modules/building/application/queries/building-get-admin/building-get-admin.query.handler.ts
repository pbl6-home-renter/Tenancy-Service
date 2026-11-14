import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { BUILDING_DI_TOKEN } from '../../../building.di-token';
import { BuildingNotFoundException } from '../../../domain/exceptions/building-not-found.exception';
import { BuildingRepository } from '../../../domain/repositories/building.repository';
import type { IInternalUserService } from '../../../infrastructure/services/internal-user.service';
import { BuildingGetAdminResult } from '../building-get-admin/building-get-admin.result';
import { BuildingGetAdminQuery } from './building-get-admin.query';
import {
  BuildingRoomStatsReader,
  emptyBuildingRoomStats,
} from '../../ports/building-room-stats.port';

@QueryHandler(BuildingGetAdminQuery)
export class BuildingGetAdminQueryHandler implements IQueryHandler<
  BuildingGetAdminQuery,
  BuildingGetAdminResult
> {
  constructor(
    @Inject(BUILDING_DI_TOKEN.REPOSITORY)
    private readonly buildingRepository: BuildingRepository,
    @Inject(BUILDING_DI_TOKEN.INTERNAL_USER)
    private readonly internalUserService: IInternalUserService,
    @Inject(BUILDING_DI_TOKEN.ROOM_STATS)
    private readonly roomStats: BuildingRoomStatsReader,
  ) {}

  async execute(query: BuildingGetAdminQuery): Promise<BuildingGetAdminResult> {
    const building = await this.buildingRepository.findById(query.buildingId);
    if (!building) throw new BuildingNotFoundException(query.buildingId);

    const landlord = await this.internalUserService.findById(
      building.landlordId,
    );
    const stats = await this.roomStats.getStats([building.id]);
    return {
      building,
      landlord,
      stats: stats.get(building.id) ?? emptyBuildingRoomStats(),
    };
  }
}
