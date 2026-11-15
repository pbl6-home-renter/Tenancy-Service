import { ApiProperty } from '@nestjs/swagger';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { RoomHubListResult } from '../../../application/queries/room-hub-list/room-hub-list.result';

export class RoomHubListResponseDto {
  @ApiProperty({ format: 'uuid' }) contractId: Uuid;
  @ApiProperty({ format: 'uuid' }) roomId: Uuid;
  @ApiProperty() roomName: string;
  @ApiProperty({ type: Number, nullable: true }) area: number | null;
  @ApiProperty({ format: 'uuid' }) buildingId: Uuid;
  @ApiProperty() buildingName: string;
  @ApiProperty() address: string;
  @ApiProperty() ward: string;
  @ApiProperty() province: string;
  @ApiProperty({ type: Number }) rentPrice: number;
  @ApiProperty({ format: 'date' }) startDate: string;
  @ApiProperty({ format: 'date' }) endDate: string;

  static fromReadModel(result: RoomHubListResult): RoomHubListResponseDto {
    const response = new RoomHubListResponseDto();
    response.contractId = result.contractId;
    response.roomId = result.roomId;
    response.roomName = result.roomName;
    response.area = result.area;
    response.buildingId = result.buildingId;
    response.buildingName = result.buildingName;
    response.address = result.address;
    response.ward = result.ward;
    response.province = result.province;
    response.rentPrice = result.rentPrice;
    response.startDate = result.startDate;
    response.endDate = result.endDate;
    return response;
  }
}
