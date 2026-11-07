import { Inject, Injectable } from '@nestjs/common';
import { INTERNAL_HTTP_DI_TOKEN } from 'shared/application/di-tokens';
import { PeerServiceRequestException } from 'shared/application/http/peer-service.exception';
import { PeerService } from 'shared/application/http/peer-service.enum';
import { IInternalHttpClient } from 'shared/application/ports/internal-http-client.port';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import {
  MediaInfo,
  MediaLookupPort,
} from '../../application/ports/media-lookup.port';

@Injectable()
export class IdentityMediaLookupService implements MediaLookupPort {
  private static readonly LOOKUP_BATCH_SIZE = 50;
  constructor(
    @Inject(INTERNAL_HTTP_DI_TOKEN.CLIENT)
    private readonly client: IInternalHttpClient,
  ) {}

  async findMedia(id: Uuid): Promise<MediaInfo | null> {
    try {
      return await this.client.get<MediaInfo>(
        PeerService.IDENTITY,
        `/internal/media/${id}`,
      );
    } catch (error) {
      if (
        error instanceof PeerServiceRequestException &&
        error.statusCode === 404
      )
        return null;
      throw error;
    }
  }

  findMediaByIds(ids: readonly Uuid[]): Promise<MediaInfo[]> {
    if (ids.length === 0) return Promise.resolve([]);
    const uniqueIds = [...new Set(ids)];
    return this.lookupInBatches(uniqueIds);
  }

  findMediaByOwner(ownerType: string, ownerId: Uuid): Promise<MediaInfo[]> {
    return this.client.get<MediaInfo[]>(
      PeerService.IDENTITY,
      `/internal/media/owner/${ownerType}/${ownerId}`,
    );
  }

  private async lookupInBatches(ids: readonly Uuid[]): Promise<MediaInfo[]> {
    const result: MediaInfo[] = [];
    for (
      let index = 0;
      index < ids.length;
      index += IdentityMediaLookupService.LOOKUP_BATCH_SIZE
    ) {
      const batch = ids.slice(
        index,
        index + IdentityMediaLookupService.LOOKUP_BATCH_SIZE,
      );
      const items = await this.client.get<MediaInfo[]>(
        PeerService.IDENTITY,
        '/internal/media',
        {
          query: { ids: batch.join(',') },
        },
      );
      result.push(...items);
    }
    return result;
  }
}
