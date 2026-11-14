import { ApiProperty, ApiPropertyOptional, ApiSchema } from '@nestjs/swagger';
import { BuildingEntity } from '../../../domain/entities/building.entity';
import { BuildingStatus } from '../../../domain/enums/building-status.enum';
import {
  BuildingRoomStats,
  formatOccupancyRate,
} from '../../../application/ports/building-room-stats.port';

@ApiSchema({ name: 'BuildingMyListResponseDto' })
export class MyBuildingListResponseDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  address: string;

  @ApiProperty({ enum: BuildingStatus })
  status: BuildingStatus;

  @ApiProperty({ minimum: 0, type: 'integer' })
  occupiedRooms: number;

  @ApiProperty({ minimum: 0, type: 'integer' })
  totalRooms: number;

  @ApiProperty({ example: '0%' })
  occupancyRate: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  rejectionReason?: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  createdAt: Date;

  static fromDomain(
    entity: BuildingEntity,
    stats: BuildingRoomStats,
  ): MyBuildingListResponseDto {
    const dto = new MyBuildingListResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.address = entity.address;
    dto.status = entity.status;
    dto.totalRooms = stats.totalRooms;
    dto.occupiedRooms = stats.occupiedRooms;
    dto.occupancyRate = formatOccupancyRate(stats);
    if (entity.status === BuildingStatus.REJECTED) {
      dto.rejectionReason = entity.note ?? undefined;
    }
    dto.createdAt = entity.createdAt;
    return dto;
  }
}
