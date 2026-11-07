import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export type MediaOwnerType =
  | 'building'
  | 'room'
  | 'contract'
  | 'contract_member'
  | 'meter_reading';

export interface MediaOwnerSnapshot {
  ownerType: MediaOwnerType;
  ownerId: Uuid;
  landlordId: Uuid | null;
  participantUserIds: Uuid[];
  status: string | null;
}

export interface MediaOwnershipQueryPort {
  findOwner(ownerType: MediaOwnerType, ownerId: Uuid): Promise<MediaOwnerSnapshot | null>;
}
