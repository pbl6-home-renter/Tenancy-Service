import { Inject, Injectable, Logger } from '@nestjs/common';
import { INTERNAL_HTTP_DI_TOKEN } from 'shared/application/di-tokens';
import { PeerService } from 'shared/application/http/peer-service.enum';
import { IInternalHttpClient } from 'shared/application/ports/internal-http-client.port';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { UserAvatarLookupPort } from '../../application/ports/user-avatar-lookup.port';
import { INTERNAL_ROUTES } from '../constants/internal-routes.constant';

interface IdentityUserAvatar {
  id: Uuid;
  isDeleted: boolean;
  avatarUrl?: string | null;
}

@Injectable()
export class IdentityUserAvatarLookupAdapter implements UserAvatarLookupPort {
  private static readonly LOOKUP_BATCH_SIZE = 100;
  private readonly logger = new Logger(IdentityUserAvatarLookupAdapter.name);

  constructor(
    @Inject(INTERNAL_HTTP_DI_TOKEN.CLIENT)
    private readonly client: IInternalHttpClient,
  ) {}

  async findAvatarUrls(userIds: readonly Uuid[]): Promise<Map<string, string>> {
    const avatarUrls = new Map<string, string>();
    const uniqueIds = [...new Set(userIds.map((id) => id.toLowerCase()))];
    try {
      for (
        let index = 0;
        index < uniqueIds.length;
        index += IdentityUserAvatarLookupAdapter.LOOKUP_BATCH_SIZE
      ) {
        const batch = uniqueIds.slice(
          index,
          index + IdentityUserAvatarLookupAdapter.LOOKUP_BATCH_SIZE,
        );
        const users = await this.client.get<IdentityUserAvatar[]>(
          PeerService.IDENTITY,
          INTERNAL_ROUTES.IDENTITY.USERS,
          { query: { ids: batch.join(',') } },
        );
        for (const user of users) {
          if (!user.isDeleted && user.avatarUrl) {
            avatarUrls.set(user.id.toLowerCase(), user.avatarUrl);
          }
        }
      }
    } catch (error) {
      // Avatars are decoration: member lists must keep working without Identity.
      this.logger.warn(
        `Avatar lookup failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return avatarUrls;
  }
}
