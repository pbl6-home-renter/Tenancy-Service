import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BuildingStatus } from 'modules/building/domain/enums/building-status.enum';
import { BuildingTypeormEntity } from 'modules/building/infrastructure/persistence/building.typeorm-entity';
import { RoomStatus } from 'modules/room/domain/enums/room-status.enum';
import { RoomTypeormEntity } from 'modules/room/infrastructure/persistence/room.typeorm-entity';
import {
  DashboardCounts,
  DashboardReader,
} from '../../application/ports/dashboard-reader.port';

@Injectable()
export class TypeOrmDashboardReader implements DashboardReader {
  constructor(
    @InjectRepository(BuildingTypeormEntity)
    private readonly buildings: Repository<BuildingTypeormEntity>,
    @InjectRepository(RoomTypeormEntity)
    private readonly rooms: Repository<RoomTypeormEntity>,
  ) {}

  async readCounts(): Promise<DashboardCounts> {
    const [buildingRows, roomRows] = await Promise.all([
      this.buildings
        .createQueryBuilder('building')
        .select('building.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .where('building.isDeleted = false')
        .groupBy('building.status')
        .getRawMany<{ status: BuildingStatus; count: string }>(),
      this.rooms
        .createQueryBuilder('room')
        .innerJoin(
          BuildingTypeormEntity,
          'building',
          'building.id = room.buildingId',
        )
        .select('room.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .where('room.isDeleted = false')
        .andWhere('building.isDeleted = false')
        .andWhere('building.status = :approved', {
          approved: BuildingStatus.APPROVED,
        })
        .groupBy('room.status')
        .getRawMany<{ status: RoomStatus; count: string }>(),
    ]);
    return {
      buildings: Object.fromEntries(
        buildingRows.map((row) => [row.status, Number(row.count)]),
      ),
      rooms: Object.fromEntries(
        roomRows.map((row) => [row.status, Number(row.count)]),
      ),
    };
  }
}
