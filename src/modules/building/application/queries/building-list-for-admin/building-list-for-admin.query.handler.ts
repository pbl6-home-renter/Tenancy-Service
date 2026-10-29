import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { BUILDING_DI_TOKEN } from '../../../building.di-token';
import { BuildingRepository } from '../../../domain/repositories/building.repository';
import type { IInternalUserService } from '../../../infrastructure/services/internal-user.service';
import { BuildingListForAdminResult } from './building-list-for-admin.result';
import { BuildingListForAdminQuery } from './building-list-for-admin.query';

@QueryHandler(BuildingListForAdminQuery)
export class BuildingListForAdminQueryHandler implements IQueryHandler<
  BuildingListForAdminQuery,
  PaginatedResult<BuildingListForAdminResult>
> {
  constructor(
    @Inject(BUILDING_DI_TOKEN.REPOSITORY)
    private readonly buildingRepository: BuildingRepository,
    @Inject(BUILDING_DI_TOKEN.INTERNAL_USER)
    private readonly internalUserService: IInternalUserService,
  ) {}

  async execute(
    query: BuildingListForAdminQuery,
  ): Promise<PaginatedResult<BuildingListForAdminResult>> {
    const result = await this.buildingRepository.findPaginatedForAdmin(
      query.options,
    );
    const ids = result.data.map((building) => building.landlordId);
    const summaries = await this.internalUserService.findByIds(ids);
    const landlords = new Map(
      summaries.map((landlord) => [landlord.id, landlord]),
    );
    return {
      data: result.data.map((building) => ({
        building,
        landlord: landlords.get(building.landlordId),
      })),
      pagination: result.pagination,
    };
  }
}
