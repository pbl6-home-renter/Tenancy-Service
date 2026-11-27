import { Inject, Injectable, Logger } from '@nestjs/common';
import { INTERNAL_HTTP_DI_TOKEN } from 'shared/application/di-tokens';
import { PeerService } from 'shared/application/http/peer-service.enum';
import { PeerServiceUnavailableException } from 'shared/application/http/peer-service.exception';
import { IInternalHttpClient } from 'shared/application/ports/internal-http-client.port';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import {
  BuildingNotificationRecipientReader,
  BuildingNotificationRecipients,
} from '../../application/ports/building-notification-recipient-reader.port';
import { INTERNAL_ROUTES } from '../constants/internal-routes.constant';

interface ActiveAdminIdsResponse {
  ids: Uuid[];
}

interface LandlordLookupResponse {
  id: Uuid;
  name: string;
}

@Injectable()
export class IdentityBuildingNotificationRecipientReader implements BuildingNotificationRecipientReader {
  private readonly logger = new Logger(
    IdentityBuildingNotificationRecipientReader.name,
  );

  constructor(
    @Inject(INTERNAL_HTTP_DI_TOKEN.CLIENT)
    private readonly client: IInternalHttpClient,
  ) {}

  async findForLandlord(
    landlordId: Uuid,
  ): Promise<BuildingNotificationRecipients | null> {
    try {
      const admins = await this.client.get<ActiveAdminIdsResponse>(
        PeerService.IDENTITY,
        INTERNAL_ROUTES.IDENTITY.ACTIVE_ADMIN_IDS,
      );
      if (admins.ids.length === 0) return null;

      const landlords = await this.client.get<LandlordLookupResponse[]>(
        PeerService.IDENTITY,
        INTERNAL_ROUTES.IDENTITY.USERS,
        { query: { ids: landlordId } },
      );
      const landlord = landlords.find((user) => user.id === landlordId);
      if (!landlord?.name) {
        throw new PeerServiceUnavailableException(
          PeerService.IDENTITY,
          'Landlord name unavailable',
        );
      }

      return {
        adminIds: admins.ids,
        landlordName: landlord.name,
      };
    } catch {
      this.logger.warn(
        'Identity lookup failed; building notification skipped.',
      );
      return null;
    }
  }
}
