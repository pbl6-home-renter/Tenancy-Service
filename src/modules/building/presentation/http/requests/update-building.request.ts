import { ApiPropertyOptional, ApiSchema } from '@nestjs/swagger';
import { IsString, Length, ValidateIf } from 'class-validator';

@ApiSchema({ name: 'BuildingUpdateRequestDto' })
export class UpdateBuildingRequest {
  @ApiPropertyOptional({ minLength: 1, maxLength: 254 })
  @ValidateIf((_request, value) => value !== undefined)
  @IsString()
  @Length(1, 254)
  name?: string;

  @ApiPropertyOptional({ minLength: 1, maxLength: 254 })
  @ValidateIf((_request, value) => value !== undefined)
  @IsString()
  @Length(1, 254)
  address?: string;
}
