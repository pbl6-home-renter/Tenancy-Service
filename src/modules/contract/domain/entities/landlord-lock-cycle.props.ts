import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export interface LandlordLockCycleProps {
  id: Uuid;
  landlordId: Uuid;
  lockedAt: Date;
  graceDeadline: Date;
  contractIds: Uuid[];
  state: 'pending' | 'elapsed' | 'superseded';
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

export interface CreateLandlordLockCycleProps {
  id: Uuid;
  landlordId: Uuid;
  lockedAt: Date;
  gracePeriodMs: number;
  contractIds: Uuid[];
}
