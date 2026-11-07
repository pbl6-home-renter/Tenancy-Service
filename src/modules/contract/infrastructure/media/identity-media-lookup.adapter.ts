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
import { INTERNAL_ROUTES } from '../constants/internal-routes.constant';

@Injectable()
export class IdentityMediaLookupAdapter implements MediaLookupPort {
  private static readonly LOOKUP_BATCH_SIZE = 50;
  constructor(
    @Inject(INTERNAL_HTTP_DI_TOKEN.CLIENT)
    private readonly client: IInternalHttpClient,
  ) {}

  async findMedia(id: Uuid): Promise<MediaInfo | null> {
    try {
      return await this.client.get<MediaInfo>(
        PeerService.IDENTITY,
        `${INTERNAL_ROUTES.IDENTITY.MEDIA}/${id}`,
      );
    } catch (error) {
      if (
        error instanceof PeerServiceRequestException &&
        error.statusCode === 404
      ) {
        return null;
      }
      throw error;
    }
  }

  async findMediaByIds(ids: readonly Uuid[]): Promise<MediaInfo[]> {
    const uniqueIds = [...new Set(ids)];
    const result: MediaInfo[] = [];
    for (
      let index = 0;
      index < uniqueIds.length;
      index += IdentityMediaLookupAdapter.LOOKUP_BATCH_SIZE
    ) {
      const batch = uniqueIds.slice(
        index,
        index + IdentityMediaLookupAdapter.LOOKUP_BATCH_SIZE,
      );
      const items = await this.client.get<MediaInfo[]>(
        PeerService.IDENTITY,
        INTERNAL_ROUTES.IDENTITY.MEDIA,
        { query: { ids: batch.join(',') } },
      );
      result.push(...items);
    }
    return result;
  }
}
