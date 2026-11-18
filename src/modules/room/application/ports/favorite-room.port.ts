import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export interface FavoriteRoomPort {
  addIfPublic(
    tenantId: Uuid,
    roomId: Uuid,
  ): Promise<{ roomName: string; added: boolean } | null>;
  remove(tenantId: Uuid, roomId: Uuid): Promise<boolean>;
}
