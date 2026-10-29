import { ApiPropertyOptional, ApiSchema } from '@nestjs/swagger';
import { IsString, Length, ValidateIf } from 'class-validator';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { BuildingUpdateCommand } from '../../../application/commands/building-update/building-update.command';

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

  static toCommand(
    request: UpdateBuildingRequest,
    buildingId: Uuid,
    landlordId: Uuid,
  ): BuildingUpdateCommand {
    return new BuildingUpdateCommand(
      landlordId,
      buildingId,
      request.name,
      request.address,
    );
  }
}
