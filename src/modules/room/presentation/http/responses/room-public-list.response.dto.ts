import { ApiProperty } from '@nestjs/swagger';
import { RoomPublicSearchResult } from '../../../application/queries/room-public-search/room-public-search.result';
import { GenderPolicy } from '../../../domain/enums/gender-policy.enum';

export class RoomPublicListResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  buildingId: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ type: 'string', nullable: true })
  area: string | null;

  @ApiProperty({ minimum: 0 })
  rentPrice: number;

  @ApiProperty({ enum: GenderPolicy })
  genderPolicy: GenderPolicy;

  @ApiProperty()
  address: string;

  @ApiProperty()
  province: string;

  @ApiProperty()
  isFavorited: boolean;

  static fromReadModel(
    room: RoomPublicSearchResult,
  ): RoomPublicListResponseDto {
    const response = new RoomPublicListResponseDto();
    response.id = room.id;
    response.buildingId = room.buildingId;
    response.name = room.name;
    response.area = room.area;
    response.rentPrice = room.rentPrice;
    response.genderPolicy = room.genderPolicy;
    response.address = room.address;
    response.province = room.province;
    response.isFavorited = false;
    return response;
  }
}
