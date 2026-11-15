import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export interface LandlordLockCycleProps {
  id: Uuid;
  landlordId: Uuid;
  lockedAt: Date;
  graceDeadline: Date;
  contractIds: Uuid[];
  state:
    'pending' | 'elapsed' | 'superseded' | 'decision_pending' | 'completed';
  unlockedAt?: Date | null;
  decisions?: Record<string, ContractLockDecision>;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

export type ContractLockDecisionAction = 'restore' | 'terminate';

export interface ContractLockDecision {
  action: ContractLockDecisionAction;
  decidedAt: string;
  origin: 'landlord' | 'grace_expired';
}

export interface CreateLandlordLockCycleProps {
  id: Uuid;
  landlordId: Uuid;
  lockedAt: Date;
  gracePeriodMs: number;
  contractIds: Uuid[];
}
