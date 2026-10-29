import { Inject, Injectable, Logger } from '@nestjs/common';
import { INTERNAL_HTTP_DI_TOKEN } from 'shared/application/di-tokens';
import { PeerServiceUnavailableException } from 'shared/application/http/peer-service.exception';
import { PeerService } from 'shared/application/http/peer-service.enum';
import { IInternalHttpClient } from 'shared/application/ports/internal-http-client.port';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { INTERNAL_ROUTES } from '../constants/internal-routes.constant';

export interface InternalUserSummary {
  id: Uuid;
  name: string;
  phone: string;
  email: string | null;
}

export interface IInternalUserService {
  findById(id: Uuid): Promise<InternalUserSummary | undefined>;
  findByIds(ids: readonly Uuid[]): Promise<InternalUserSummary[]>;
}

@Injectable()
export class InternalUserService implements IInternalUserService {
  private readonly logger = new Logger(InternalUserService.name);

  constructor(
    @Inject(INTERNAL_HTTP_DI_TOKEN.CLIENT)
    private readonly client: IInternalHttpClient,
  ) {}

  async findById(id: Uuid): Promise<InternalUserSummary | undefined> {
    const users = await this.findByIds([id]);
    return users.find((user) => user.id === id);
  }

  async findByIds(ids: readonly Uuid[]): Promise<InternalUserSummary[]> {
    if (ids.length === 0) return [];

    try {
      return await this.client.get<InternalUserSummary[]>(
        PeerService.IDENTITY,
        INTERNAL_ROUTES.IDENTITY.USERS,
        { query: { ids: [...new Set(ids)].join(',') } },
      );
    } catch (error) {
      if (!(error instanceof PeerServiceUnavailableException)) throw error;
      this.logger.warn(
        'Identity unavailable; user display data will omit contact details.',
      );
      return [];
    }
  }
}
