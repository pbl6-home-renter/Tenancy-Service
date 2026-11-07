import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { MediaOwnerUnavailableException } from '../../../domain/exceptions/media-owner-unavailable.exception';
import {
  MediaOwnershipQueryPort,
  MediaOwnerSnapshot,
} from '../../ports/media-ownership-query.port';
import { MediaOwnerLookupQuery } from './media-owner-lookup.query';

export const MEDIA_OWNERSHIP_QUERY = Symbol('MEDIA_OWNERSHIP_QUERY');

@QueryHandler(MediaOwnerLookupQuery)
export class MediaOwnerLookupQueryHandler implements IQueryHandler<
  MediaOwnerLookupQuery,
  MediaOwnerSnapshot
> {
  constructor(
    @Inject(MEDIA_OWNERSHIP_QUERY)
    private readonly ownership: MediaOwnershipQueryPort,
  ) {}

  async execute({ ownerType, ownerId }: MediaOwnerLookupQuery): Promise<MediaOwnerSnapshot> {
    const owner = await this.ownership.findOwner(ownerType, ownerId);
    if (!owner) throw new MediaOwnerUnavailableException(ownerType, ownerId);
    return owner;
  }
}
