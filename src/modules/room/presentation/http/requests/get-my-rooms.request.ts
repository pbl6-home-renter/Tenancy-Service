import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { OffsetPaginationQueryRequestDto } from 'shared/presentation/pagination/offset-pagination.request.dto';
import { RoomListFilterRequest } from './room-list-filter.request';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { RoomGetMyRoomsQuery } from '../../../application/queries/room-get-my-rooms/room-get-my-rooms.query';

const roomSortFields = [
  'name',
  'rentPrice',
  'area',
  'floorNumber',
  'status',
  'createdAt',
  'updatedAt',
] as const;

export class GetMyRoomsRequest extends OffsetPaginationQueryRequestDto<RoomListFilterRequest> {
  static toQuery(
    request: GetMyRoomsRequest,
    landlordId: Uuid,
  ): RoomGetMyRoomsQuery {
    return new RoomGetMyRoomsQuery(landlordId, request);
  }

  @ApiPropertyOptional({
    enum: ['json', 'xlsx', 'csv', 'pdf'],
    default: 'json',
  })
  @IsOptional()
  @IsIn(['json', 'xlsx', 'csv', 'pdf'])
  format: 'json' | 'xlsx' | 'csv' | 'pdf' = 'json';

  @ApiPropertyOptional({
    type: RoomListFilterRequest,
    description:
      'Filter by building and room status; serialized as filter[buildingId] and filter[status].',
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => RoomListFilterRequest)
  override filter?: RoomListFilterRequest = undefined;

  @ApiPropertyOptional({ enum: roomSortFields, default: 'rentPrice' })
  @IsOptional()
  @IsString()
  @IsIn(roomSortFields)
  override sort?: string = undefined;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'asc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  override order?: 'asc' | 'desc' = undefined;
}
