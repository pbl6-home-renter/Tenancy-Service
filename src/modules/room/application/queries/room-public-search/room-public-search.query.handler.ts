import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { ROOM_DI_TOKEN } from '../../../room.di-token';
import { RoomPublicSearchResult } from './room-public-search.result';
import type { RoomReadRepository } from '../../../infrastructure/persistence/room-read.repository';
import { RoomPublicSearchQuery } from './room-public-search.query';

@QueryHandler(RoomPublicSearchQuery)
export class RoomPublicSearchQueryHandler implements IQueryHandler<
  RoomPublicSearchQuery,
  PaginatedResult<RoomPublicSearchResult>
> {
  constructor(
    @Inject(ROOM_DI_TOKEN.READ_REPOSITORY)
    private readonly roomReadRepository: RoomReadRepository,
  ) {}

  execute(
    query: RoomPublicSearchQuery,
  ): Promise<PaginatedResult<RoomPublicSearchResult>> {
    return this.roomReadRepository.searchPublic(query.options);
  }
}
