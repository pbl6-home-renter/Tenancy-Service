import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { CONTRACT_DI_TOKEN } from '../../../contract.di-token';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { RoomHubPageQueryPort } from '../../ports/room-hub-page-query.port';
import { RoomHubListQuery } from './room-hub-list.query';
import { RoomHubListResult } from './room-hub-list.result';

@QueryHandler(RoomHubListQuery)
export class RoomHubListQueryHandler implements IQueryHandler<
  RoomHubListQuery,
  PaginatedResult<RoomHubListResult>
> {
  constructor(
    @Inject(CONTRACT_DI_TOKEN.ROOM_HUB_PAGE_QUERY)
    private readonly pageQuery: RoomHubPageQueryPort,
  ) {}

  execute(
    query: RoomHubListQuery,
  ): Promise<PaginatedResult<RoomHubListResult>> {
    return this.pageQuery.findPage(query.tenantId, query.options);
  }
}
