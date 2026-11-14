import { BuildingListForAdminResult } from '../building-list-for-admin/building-list-for-admin.result';
import { BuildingRoomStats } from '../../ports/building-room-stats.port';

export type BuildingGetAdminResult = BuildingListForAdminResult & {
  stats: BuildingRoomStats;
};
