import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export interface RoomHubListResult {
  contractId: Uuid;
  roomId: Uuid;
  roomName: string;
  area: number | null;
  buildingId: Uuid;
  buildingName: string;
  address: string;
  ward: string;
  province: string;
  rentPrice: number;
  startDate: string;
  endDate: string;
}
