import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { RateItemRequest } from './rate-item.request.dto';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { RatePolicyUpdateCommand } from '../../../application/commands/rate-policy-update/rate-policy-update.command';

export class UpdateRatePolicyRequest {
  @ApiPropertyOptional({ type: [RateItemRequest], minItems: 1 })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RateItemRequest)
  rates?: RateItemRequest[];

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  static toCommand(
    request: UpdateRatePolicyRequest,
    policyId: Uuid,
    landlordId: Uuid,
  ): RatePolicyUpdateCommand {
    return new RatePolicyUpdateCommand(
      landlordId,
      policyId,
      request.rates === undefined
        ? undefined
        : RateItemRequest.toDomain(request.rates),
      request.isActive,
    );
  }
}
