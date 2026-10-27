import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Room } from '../../../domain/entities/room.entity';
import { RoomStatus } from '../../../domain/enums/room-status.enum';

export class RoomMyListResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  buildingId: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional({ type: 'string', nullable: true })
  roomType: null = null;

  @ApiPropertyOptional({ type: 'string', nullable: true })
  area: string | null;

  @ApiProperty({ minimum: 0 })
  rentPrice: number;

  @ApiProperty({ enum: RoomStatus })
  status: RoomStatus;

  @ApiPropertyOptional({ type: 'integer', nullable: true })
  floorNumber: number | null;

  @ApiPropertyOptional({ type: 'string', nullable: true })
  currentTenantName: null = null;

  @ApiPropertyOptional({ type: 'string', nullable: true })
  currentTenantPhone: null = null;

  @ApiProperty({ minimum: 0 })
  activeIssuesCount = 0;

  static fromDomain(room: Room): RoomMyListResponseDto {
    const response = new RoomMyListResponseDto();
    response.id = room.id;
    response.buildingId = room.buildingId;
    response.name = room.name;
    response.area = room.area === null ? null : String(room.area);
    response.rentPrice = room.rentPrice;
    response.status = room.status;
    response.floorNumber = room.floorNumber;
    return response;
  }
}
