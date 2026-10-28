import { ApiProperty, ApiPropertyOptional, ApiSchema } from '@nestjs/swagger';
import { BuildingEntity } from '../../../domain/entities/building.entity';
import { BuildingStatus } from '../../../domain/enums/building-status.enum';

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

  @ApiProperty({ example: '0%' })
  occupancyRate: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  rejectionReason?: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  createdAt: Date;

  static fromDomain(entity: BuildingEntity): MyBuildingListResponseDto {
    const dto = new MyBuildingListResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.address = entity.address;
    dto.status = entity.status;
    // TODO(room): Populate occupancy statistics when room and Contract data are integrated.
    dto.occupiedRooms = 0;
    dto.occupancyRate = '0%';
    if (entity.status === BuildingStatus.REJECTED) {
      dto.rejectionReason = entity.note ?? undefined;
    }
    dto.createdAt = entity.createdAt;
    return dto;
  }
}
