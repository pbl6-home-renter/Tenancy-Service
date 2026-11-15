import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export interface LandlordLockEvidence {
  lockedAt: string;
  unlockedAt: string | null;
  latestLockedAt: string | null;
  observedAt: string;
  state: 'locked' | 'unlocked' | 'unknown';
}

export interface LandlordLockEvidencePort {
  find(landlordId: Uuid, lockedAt: Date): Promise<LandlordLockEvidence | null>;
}
