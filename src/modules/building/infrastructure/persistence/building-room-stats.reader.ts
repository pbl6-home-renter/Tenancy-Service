import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoomStatus } from 'modules/room/domain/enums/room-status.enum';
import { RoomTypeormEntity } from 'modules/room/infrastructure/persistence/room.typeorm-entity';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import {
  BuildingRoomStats,
  BuildingRoomStatsReader,
} from '../../application/ports/building-room-stats.port';

@Injectable()
export class TypeOrmBuildingRoomStatsReader implements BuildingRoomStatsReader {
  constructor(
    @InjectRepository(RoomTypeormEntity)
    private readonly rooms: Repository<RoomTypeormEntity>,
  ) {}

  async getStats(buildingIds: Uuid[]): Promise<Map<Uuid, BuildingRoomStats>> {
    if (buildingIds.length === 0) return new Map();
    const rows = await this.rooms
      .createQueryBuilder('room')
      .select('room.buildingId', 'buildingId')
      .addSelect('COUNT(*)', 'totalRooms')
      .addSelect(
        'COUNT(*) FILTER (WHERE room.status = :occupied)',
        'occupiedRooms',
      )
      .where('room.buildingId IN (:...buildingIds)', { buildingIds })
      .andWhere('room.isDeleted = false')
      .setParameter('occupied', RoomStatus.OCCUPIED)
      .groupBy('room.buildingId')
      .getRawMany<{
        buildingId: Uuid;
        totalRooms: string;
        occupiedRooms: string;
      }>();
    return new Map(
      rows.map((row) => [
        row.buildingId,
        {
          totalRooms: Number(row.totalRooms),
          occupiedRooms: Number(row.occupiedRooms),
        },
      ]),
    );
  }
}
