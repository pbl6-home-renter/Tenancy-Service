import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsPositive,
  IsString,
  Length,
  Min,
  Validate,
  ValidateIf,
  ValidateNested,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { RoomUpdateCommand } from '../../../application/commands/room-update/room-update.command';
import { GenderPolicy } from '../../../domain/enums/gender-policy.enum';
import { UpdateRoomProps } from '../../../domain/entities/room.props';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { RoomAmenitiesRequest } from './room-amenities.request';

const ROOM_UPDATE_FIELDS = [
  'name',
  'rentPrice',
  'area',
  'floorNumber',
  'description',
  'amenities',
  'maxOccupancy',
  'genderPolicy',
] as const satisfies readonly (keyof UpdateRoomProps)[];

@ValidatorConstraint({ name: 'validRoomUpdateRequest', async: false })
class RoomUpdateRequestConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const request = args.object as RoomUpdateRequest;
    if (ROOM_UPDATE_FIELDS.every((field) => request[field] === undefined)) {
      return false;
    }

    return (
      request.name === undefined ||
      (typeof request.name === 'string' &&
        request.name.length >= 1 &&
        request.name.length <= 254)
    );
  }

  defaultMessage(): string {
    return 'VALIDATION_FAILED';
  }
}

export class RoomUpdateRequest {
  @ApiPropertyOptional({ minLength: 1, maxLength: 254 })
  @Validate(RoomUpdateRequestConstraint)
  name?: string;

  @ApiPropertyOptional({ minimum: 1, nullable: true, type: 'integer' })
  @ValidateIf((_request, value) => value !== undefined && value !== null)
  @IsInt()
  @Min(1)
  floorNumber?: number | null;

  @ApiPropertyOptional({ minLength: 1, maxLength: 500, nullable: true })
  @ValidateIf((_request, value) => value !== undefined && value !== null)
  @IsString()
  @Length(1, 500)
  description?: string | null;

  @ApiPropertyOptional({ minimum: 0, nullable: true, type: 'number' })
  @ValidateIf((_request, value) => value !== undefined && value !== null)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsPositive()
  area?: number | null;

  @ApiPropertyOptional({ type: RoomAmenitiesRequest })
  @ValidateIf((_request, value) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => RoomAmenitiesRequest)
  amenities?: RoomAmenitiesRequest;

  @ApiPropertyOptional({ minimum: 1, nullable: true, type: 'integer' })
  @ValidateIf((_request, value) => value !== undefined && value !== null)
  @IsInt()
  @Min(1)
  maxOccupancy?: number | null;

  @ApiPropertyOptional({ enum: GenderPolicy })
  @ValidateIf((_request, value) => value !== undefined)
  @IsEnum(GenderPolicy)
  genderPolicy?: GenderPolicy;

  @ApiPropertyOptional({ minimum: 0, type: 'number' })
  @ValidateIf((_request, value) => value !== undefined)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  rentPrice?: number;

  static toCommand(
    request: RoomUpdateRequest,
    roomId: Uuid,
    landlordId: Uuid,
  ): RoomUpdateCommand {
    const updates: UpdateRoomProps = {};

    if (request.name !== undefined) updates.name = request.name;
    if (request.rentPrice !== undefined) updates.rentPrice = request.rentPrice;
    if (request.area !== undefined) updates.area = request.area;
    if (request.floorNumber !== undefined)
      updates.floorNumber = request.floorNumber;
    if (request.description !== undefined)
      updates.description = request.description;
    if (request.amenities !== undefined)
      updates.amenities = request.amenities.toRoomAmenities();
    if (request.maxOccupancy !== undefined)
      updates.maxOccupancy = request.maxOccupancy;
    if (request.genderPolicy !== undefined)
      updates.genderPolicy = request.genderPolicy;

    return new RoomUpdateCommand(roomId, landlordId, updates);
  }
}
