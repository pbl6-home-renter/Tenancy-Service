import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { ROOM_DI_TOKEN } from '../../../room.di-token';
import { RoomPublicSearchResult } from './room-public-search.result';
import type { RoomReadRepository } from '../../../infrastructure/persistence/room-read.repository';
import { RoomPublicSearchQuery } from './room-public-search.query';
import { MEDIA_LOOKUP_PORT, MediaLookupPort } from 'modules/media/application/ports/media-lookup.port';

@QueryHandler(RoomPublicSearchQuery)
export class RoomPublicSearchQueryHandler implements IQueryHandler<
  RoomPublicSearchQuery,
  PaginatedResult<RoomPublicSearchResult>
> {
  constructor(
    @Inject(ROOM_DI_TOKEN.READ_REPOSITORY)
    private readonly roomReadRepository: RoomReadRepository,
    @Inject(MEDIA_LOOKUP_PORT)
    private readonly mediaLookup: MediaLookupPort,
  ) {}

  async execute(
    query: RoomPublicSearchQuery,
  ): Promise<PaginatedResult<RoomPublicSearchResult>> {
    const result = await this.roomReadRepository.searchPublic(query.options);
    const ids = [...new Set(result.data.flatMap((room) => room.photoMediaIds))];
    if (ids.length === 0) return result;
    const media = await this.mediaLookup.findMediaByIds(ids);
    const urlById = new Map(media.map((item) => [item.id, item.url ?? `/api/v1/media/${item.id}`]));
    return {
      ...result,
      data: result.data.map((room) => ({
        ...room,
        photoUrls: room.photoMediaIds.map((id) => urlById.get(id) ?? `/api/v1/media/${id}`),
      })),
    };
  }
}
