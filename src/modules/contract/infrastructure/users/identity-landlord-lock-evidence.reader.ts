import { Inject, Injectable, Logger } from '@nestjs/common';
import { INTERNAL_HTTP_DI_TOKEN } from 'shared/application/di-tokens';
import { IInternalHttpClient } from 'shared/application/ports/internal-http-client.port';
import { PeerService } from 'shared/application/http/peer-service.enum';
import {
  PeerServiceRequestException,
  PeerServiceUnavailableException,
} from 'shared/application/http/peer-service.exception';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import {
  LandlordLockEvidence,
  LandlordLockEvidencePort,
} from '../../application/ports/landlord-lock-evidence.port';
import { INTERNAL_ROUTES } from '../constants/internal-routes.constant';

@Injectable()
export class IdentityLandlordLockEvidenceReader implements LandlordLockEvidencePort {
  private readonly logger = new Logger(IdentityLandlordLockEvidenceReader.name);

  constructor(
    @Inject(INTERNAL_HTTP_DI_TOKEN.CLIENT)
    private readonly client: IInternalHttpClient,
  ) {}

  async find(
    landlordId: Uuid,
    lockedAt: Date,
  ): Promise<LandlordLockEvidence | null> {
    try {
      const result = await this.client.get<LandlordLockEvidence>(
        PeerService.IDENTITY,
        `${INTERNAL_ROUTES.IDENTITY.USERS}/${landlordId}/lock-period`,
        { query: { lockedAt: lockedAt.toISOString() } },
      );
      if (
        !result ||
        result.lockedAt !== lockedAt.toISOString() ||
        !['locked', 'unlocked', 'unknown'].includes(result.state) ||
        !Number.isFinite(Date.parse(result.observedAt)) ||
        (result.unlockedAt !== null &&
          !Number.isFinite(Date.parse(result.unlockedAt))) ||
        (result.latestLockedAt !== null &&
          !Number.isFinite(Date.parse(result.latestLockedAt))) ||
        (result.state === 'unlocked' && result.unlockedAt === null) ||
        (result.state === 'locked' && result.unlockedAt !== null) ||
        (result.unlockedAt !== null &&
          (Date.parse(result.unlockedAt) < lockedAt.getTime() ||
            Date.parse(result.unlockedAt) > Date.parse(result.observedAt)))
      ) {
        this.logger.warn(
          `Invalid lock evidence for landlord ${landlordId}; retaining lock cycle`,
        );
        return null;
      }
      return result;
    } catch (error) {
      if (
        !(error instanceof PeerServiceRequestException) &&
        !(error instanceof PeerServiceUnavailableException)
      )
        throw error;
      this.logger.warn(
        `Lock evidence unavailable for landlord ${landlordId}; retaining lock cycle`,
      );
      return null;
    }
  }
}
