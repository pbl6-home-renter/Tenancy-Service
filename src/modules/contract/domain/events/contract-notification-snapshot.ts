import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export interface ContractNotificationSnapshot {
  contractId: Uuid;
  contractCode: string;
  roomName: string | null;
}
