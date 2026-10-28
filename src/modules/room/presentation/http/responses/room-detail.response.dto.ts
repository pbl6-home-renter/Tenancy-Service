import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoomDetailResult } from '../../../application/queries/room-get-detail/room-get-detail.result';
import { GenderPolicy } from '../../../domain/enums/gender-policy.enum';
import { RoomStatus } from '../../../domain/enums/room-status.enum';
import { RoomAmenities } from '../../../domain/value-objects/room-amenities.vo';

export class RoomDetailResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  buildingId: string;

  @ApiProperty()
  buildingName: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional({ type: 'string', nullable: true })
  description: string | null;

  @ApiPropertyOptional({ type: 'string', nullable: true })
  area: string | null;

  @ApiPropertyOptional({ type: 'integer', nullable: true })
  floorNumber: number | null;

  @ApiProperty({ minimum: 0 })
  rentPrice: number;

  @ApiProperty({ minimum: 0 })
  depositAmount: number;

  @ApiProperty({ enum: RoomStatus })
  status: RoomStatus;

  @ApiPropertyOptional({ type: 'integer', nullable: true })
  maxOccupancy: number | null;

  @ApiProperty({ enum: GenderPolicy })
  genderPolicy: GenderPolicy;

  @ApiProperty({ type: Object })
  amenities: RoomAmenities;

  @ApiProperty({ type: [String] })
  photoUrls: string[] = [];

  @ApiProperty({ nullable: true })
  landlord: { id: string; name: string; phone: string } | null = null;

  @ApiPropertyOptional({ type: Object, nullable: true })
  currentContract: {
    id: string;
    contractCode: string;
    startDate: string;
    endDate: string;
    status: string;
  } | null = null;

  @ApiProperty({ type: [Object] })
  currentMembers: {
    id: string;
    name: string;
    phone: string | null;
    avatarUrl: string | null;
    isRepresentative: boolean;
  }[] = [];

  @ApiPropertyOptional({ type: Object, nullable: true })
  latestMeterReadings: {
    electricity: string | null;
    water: string | null;
    recordedAt: string | null;
  } | null = null;

  @ApiPropertyOptional({ type: Object, nullable: true })
  effectiveRatePolicySummary: {
    electricity: string;
    water: string;
  } | null = null;

  static fromReadModel(room: RoomDetailResult): RoomDetailResponseDto {
    const response = new RoomDetailResponseDto();
    response.id = room.id;
    response.buildingId = room.buildingId;
    response.buildingName = room.buildingName;
    response.name = room.name;
    response.description = room.description;
    response.area = room.area;
    response.floorNumber = room.floorNumber;
    response.rentPrice = room.rentPrice;
    response.depositAmount = room.depositAmount;
    response.status = room.status;
    response.maxOccupancy = room.maxOccupancy;
    response.genderPolicy = room.genderPolicy;
    response.amenities = room.amenities;
    // TODO(identity): Resolve landlord name and phone when Identity exposes an internal lookup.
    // TODO(media): Resolve uploaded room photo IDs to public URLs.
    // TODO(contract): Populate the active contract and current contract members.
    // TODO(billing): Populate the latest meter readings and effective rate policy.
    return response;
  }
}
