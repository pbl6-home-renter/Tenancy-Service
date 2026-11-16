import { Inject, Injectable } from '@nestjs/common';
import { INTERNAL_HTTP_DI_TOKEN } from 'shared/application/di-tokens';
import { PeerService } from 'shared/application/http/peer-service.enum';
import { IInternalHttpClient } from 'shared/application/ports/internal-http-client.port';
import { UserRole } from 'shared/domain/enums/user-role.enum';
import { UserStatus } from 'shared/domain/enums/user-status.enum';
import {
  TenantDirectoryPort,
  TenantSummary,
} from '../../application/ports/tenant-directory.port';

interface IdentityUser extends TenantSummary {
  role: UserRole;
  status: UserStatus;
  isDeleted: boolean;
}

@Injectable()
export class IdentityTenantDirectoryAdapter implements TenantDirectoryPort {
  constructor(
    @Inject(INTERNAL_HTTP_DI_TOKEN.CLIENT)
    private readonly client: IInternalHttpClient,
  ) {}

  async findActive(
    ids: readonly string[],
  ): Promise<Map<string, TenantSummary>> {
    const found = new Map<string, TenantSummary>();
    const unique = [...new Set(ids.map((id) => id.toLowerCase()))];
    for (let i = 0; i < unique.length; i += 100) {
      const users = await this.client.get<IdentityUser[]>(
        PeerService.IDENTITY,
        '/internal/users',
        {
          query: { ids: unique.slice(i, i + 100).join(',') },
        },
      );
      for (const user of users) {
        if (
          !user.isDeleted &&
          user.role === UserRole.TENANT &&
          user.status === UserStatus.ACTIVE &&
          user.name?.trim()
        ) {
          found.set(user.id.toLowerCase(), {
            id: user.id,
            name: user.name,
            avatarUrl: user.avatarUrl,
          });
        }
      }
    }
    return found;
  }
}
