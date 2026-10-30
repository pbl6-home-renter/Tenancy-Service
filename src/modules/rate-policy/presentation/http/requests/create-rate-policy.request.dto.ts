import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { IsUuid } from 'shared/presentation/validators/is-uuid.decorator';
import { RatePolicyCreateCommand } from '../../../application/commands/rate-policy-create/rate-policy-create.command';
import { RatePolicyScope } from '../../../domain/enums/rate-policy-scope.enum';
import { RateItemRequest } from './rate-item.request.dto';

export class CreateRatePolicyRequest {
  @ApiProperty({ enum: RatePolicyScope })
  @IsEnum(RatePolicyScope)
  scope: RatePolicyScope;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUuid()
  buildingId?: Uuid;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUuid()
  roomId?: Uuid;

  @ApiProperty({ type: [RateItemRequest], minItems: 1 })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RateItemRequest)
  rates: RateItemRequest[];

  static toCommand(
    request: CreateRatePolicyRequest,
    landlordId: Uuid,
  ): RatePolicyCreateCommand {
    return new RatePolicyCreateCommand(
      landlordId,
      request.scope,
      request.buildingId,
      request.roomId,
      RateItemRequest.toDomain(request.rates),
    );
  }
}
