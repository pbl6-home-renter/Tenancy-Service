import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { BuildingEntity } from '../../domain/entities/building.entity';

export interface BuildingRoomStats {
  totalRooms: number;
  occupiedRooms: number;
}

export interface BuildingRoomStatsReader {
  getStats(buildingIds: Uuid[]): Promise<Map<Uuid, BuildingRoomStats>>;
}

export interface BuildingWithStats {
  building: BuildingEntity;
  stats: BuildingRoomStats;
}

export const emptyBuildingRoomStats = (): BuildingRoomStats => ({
  totalRooms: 0,
  occupiedRooms: 0,
});

export function formatOccupancyRate(stats: BuildingRoomStats): string {
  if (stats.totalRooms === 0) return '0%';
  return `${Math.round((stats.occupiedRooms / stats.totalRooms) * 1000) / 10}%`;
}
