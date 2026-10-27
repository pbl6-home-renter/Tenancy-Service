import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { IsUuid } from 'shared/presentation/validators/is-uuid.decorator';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { RoomStatus } from '../../../domain/enums/room-status.enum';

export class RoomListFilterRequest {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUuid()
  buildingId?: Uuid;

  @ApiPropertyOptional({ enum: RoomStatus })
  @IsOptional()
  @IsIn(Object.values(RoomStatus))
  status?: RoomStatus;
}
