import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export interface BuildingNotificationRecipients {
  readonly adminIds: Uuid[];
  readonly landlordName: string;
}

export interface BuildingNotificationRecipientReader {
  findForLandlord(
    landlordId: Uuid,
  ): Promise<BuildingNotificationRecipients | null>;
}
