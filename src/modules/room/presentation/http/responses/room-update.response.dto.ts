import { ApiProperty } from '@nestjs/swagger';
import { Room } from '../../../domain/entities/room.entity';
import { GenderPolicy } from '../../../domain/enums/gender-policy.enum';
import { RoomAmenities } from '../../../domain/value-objects/room-amenities.vo';

export class RoomUpdateResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ type: 'integer', nullable: true })
  floorNumber: number | null;

  @ApiProperty({ type: 'string', nullable: true })
  description: string | null;

  @ApiProperty({ type: 'number', nullable: true })
  area: number | null;

  @ApiProperty({ type: 'object', additionalProperties: { type: 'boolean' } })
  amenities: RoomAmenities;

  @ApiProperty({ type: 'integer', nullable: true })
  maxOccupancy: number | null;

  @ApiProperty({ enum: GenderPolicy })
  genderPolicy: GenderPolicy;

  @ApiProperty({ minimum: 0, type: 'number' })
  rentPrice: number;

  static fromDomain(room: Room): RoomUpdateResponseDto {
    const response = new RoomUpdateResponseDto();
    response.id = room.id;
    response.name = room.name;
    response.floorNumber = room.floorNumber;
    response.description = room.description;
    response.area = room.area;
    response.amenities = room.amenities;
    response.maxOccupancy = room.maxOccupancy;
    response.genderPolicy = room.genderPolicy;
    response.rentPrice = room.rentPrice;
    return response;
  }
}
