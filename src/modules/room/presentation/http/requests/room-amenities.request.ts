import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { RoomAmenities } from '../../../domain/value-objects/room-amenities.vo';

export class RoomAmenitiesRequest {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  aircon?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  fridge?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  wcInside?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  waterHeater?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  mezzanine?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  table?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  chair?: boolean;

  toRoomAmenities(): RoomAmenities {
    const amenities: RoomAmenities = {};

    if (this.aircon !== undefined) amenities.aircon = this.aircon;
    if (this.fridge !== undefined) amenities.fridge = this.fridge;
    if (this.wcInside !== undefined) amenities.wcInside = this.wcInside;
    if (this.waterHeater !== undefined)
      amenities.waterHeater = this.waterHeater;
    if (this.mezzanine !== undefined) amenities.mezzanine = this.mezzanine;
    if (this.table !== undefined) amenities.table = this.table;
    if (this.chair !== undefined) amenities.chair = this.chair;

    return amenities;
  }
}
