import { BuildingStatus } from 'modules/building/domain/enums/building-status.enum';
import { RoomStatus } from 'modules/room/domain/enums/room-status.enum';

export interface DashboardCounts {
  buildings: Partial<Record<BuildingStatus, number>>;
  rooms: Partial<Record<RoomStatus, number>>;
}

export interface DashboardReader {
  readCounts(): Promise<DashboardCounts>;
}
