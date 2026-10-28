import { ApiProperty } from '@nestjs/swagger';
import { Room } from '../../../domain/entities/room.entity';
import { RoomStatus } from '../../../domain/enums/room-status.enum';

export class RoomCreateResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  buildingId: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: [RoomStatus.AVAILABLE] })
  status: RoomStatus;

  @ApiProperty({ minimum: 0 })
  rentPrice: number;

  static fromDomain(room: Room): RoomCreateResponseDto {
    const response = new RoomCreateResponseDto();
    response.id = room.id;
    response.buildingId = room.buildingId;
    response.name = room.name;
    response.status = room.status;
    response.rentPrice = room.rentPrice;
    return response;
  }
}
