import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { UserRole } from 'shared/domain/enums/user-role.enum';
import { BuildingStatus } from 'modules/building/domain/enums/building-status.enum';
import { RoomNotFoundException } from '../../../domain/exceptions/room-not-found.exception';
import { ROOM_DI_TOKEN } from '../../../room.di-token';
import type { RoomReadRepository } from '../../../infrastructure/persistence/room-read.repository';
import { RoomDetailResult } from './room-get-detail.result';
import { RoomGetDetailQuery } from './room-get-detail.query';
import { MEDIA_LOOKUP_PORT, MediaLookupPort } from 'modules/media/application/ports/media-lookup.port';

@QueryHandler(RoomGetDetailQuery)
export class RoomGetDetailQueryHandler implements IQueryHandler<
  RoomGetDetailQuery,
  RoomDetailResult
> {
  constructor(
    @Inject(ROOM_DI_TOKEN.READ_REPOSITORY)
    private readonly roomReadRepository: RoomReadRepository,
    @Inject(MEDIA_LOOKUP_PORT)
    private readonly mediaLookup: MediaLookupPort,
  ) {}

  async execute(query: RoomGetDetailQuery): Promise<RoomDetailResult> {
    const access = await this.roomReadRepository.findDetailAccessById(
      query.roomId,
    );
    if (!access) {
      throw new RoomNotFoundException(query.roomId);
    }

    const viewer = query.viewer;
    const isOwner =
      viewer?.role === UserRole.LANDLORD && viewer.id === access.landlordId;
    const isAdmin = viewer?.role === UserRole.ADMIN;

    if (!isOwner && !isAdmin) {
      if (
        access.buildingStatus !== BuildingStatus.APPROVED ||
        access.buildingIsDeleted !== false
      ) {
        throw new RoomNotFoundException(query.roomId);
      }
    }

    const room = await this.roomReadRepository.findDetailById(query.roomId);
    if (!room) {
      throw new RoomNotFoundException(query.roomId);
    }

    const media = await this.mediaLookup.findMediaByIds(room.photoMediaIds);
    const urlById = new Map(media.map((item) => [item.id, item.url ?? `/api/v1/media/${item.id}`]));
    return {
      ...room,
      photoUrls: room.photoMediaIds.map((id) => urlById.get(id) ?? `/api/v1/media/${id}`),
    };
  }
}
