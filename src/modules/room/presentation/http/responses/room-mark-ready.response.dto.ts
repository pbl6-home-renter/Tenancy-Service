import { ApiProperty } from '@nestjs/swagger';
import { Room } from '../../../domain/entities/room.entity';
import { RoomStatus } from '../../../domain/enums/room-status.enum';

export class RoomMarkReadyResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: RoomStatus, example: RoomStatus.AVAILABLE })
  status: RoomStatus;

  static fromDomain(room: Room): RoomMarkReadyResponseDto {
    const response = new RoomMarkReadyResponseDto();
    response.id = room.id;
    response.status = room.status;
    return response;
  }
}
