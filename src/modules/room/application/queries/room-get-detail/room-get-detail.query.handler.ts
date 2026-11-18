import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { UserRole } from 'shared/domain/enums/user-role.enum';
import { BuildingStatus } from 'modules/building/domain/enums/building-status.enum';
import { RoomNotFoundException } from '../../../domain/exceptions/room-not-found.exception';
import { ROOM_DI_TOKEN } from '../../../room.di-token';
import type { RoomReadRepository } from '../../../infrastructure/persistence/room-read.repository';
import { RoomDetailResult } from './room-get-detail.result';
import { RoomGetDetailQuery } from './room-get-detail.query';
import {
  MEDIA_LOOKUP_PORT,
  MediaLookupPort,
} from 'modules/media/application/ports/media-lookup.port';
import { LandlordContactPort } from '../../ports/landlord-contact.port';
import { roomPhotoUrls } from '../../room-photo-urls';

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
    @Inject(ROOM_DI_TOKEN.LANDLORD_CONTACT)
    private readonly landlordContact: LandlordContactPort,
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

    const [media, landlord] = await Promise.all([
      this.mediaLookup.findMediaByIds(room.photoMediaIds),
      this.landlordContact.findById(room.landlordId),
    ]);
    // A deleted/missing owner is not a valid public listing. Transport errors propagate as 503.
    if (!landlord) throw new RoomNotFoundException(query.roomId);
    return {
      ...room,
      landlord,
      photoUrls: roomPhotoUrls(room.id, room.photoMediaIds, media),
    };
  }
}
