import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import { IsUuid } from 'shared/presentation/validators/is-uuid.decorator';
import { RoomCreateCommand } from '../../../application/commands/room-create/room-create.command';
import { GenderPolicy } from '../../../domain/enums/gender-policy.enum';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { RoomAmenitiesRequest } from './room-amenities.request';

export class RoomCreateRequest {
  @ApiProperty({ format: 'uuid' })
  @IsUuid()
  buildingId: Uuid;

  @ApiProperty({ minLength: 1, maxLength: 254 })
  @IsString()
  @Length(1, 254)
  name: string;

  @ApiProperty({ minimum: 1, type: 'integer' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  floorNumber: number;

  @ApiProperty({ type: 'string', example: '18.5' })
  @IsString()
  @Matches(/^(?=.*[1-9])\d+(?:\.\d+)?$/)
  area: string;

  @ApiProperty({ minimum: 0, type: 'integer' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  rentPrice: number;

  @ApiProperty({ minimum: 0, type: 'integer' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  depositAmount: number;

  @ApiPropertyOptional({ minimum: 1, nullable: true, type: 'integer' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxOccupancy?: number | null;

  @ApiProperty({ enum: GenderPolicy })
  @IsEnum(GenderPolicy)
  genderPolicy: GenderPolicy;

  @ApiPropertyOptional({ type: RoomAmenitiesRequest })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => RoomAmenitiesRequest)
  amenities?: RoomAmenitiesRequest;

  static toCommand(
    request: RoomCreateRequest,
    landlordId: Uuid,
  ): RoomCreateCommand {
    return new RoomCreateCommand(
      landlordId,
      request.buildingId,
      request.name,
      request.floorNumber,
      Number(request.area),
      request.rentPrice,
      request.depositAmount,
      request.genderPolicy,
      request.maxOccupancy,
      request.amenities?.toRoomAmenities(),
    );
  }
}
