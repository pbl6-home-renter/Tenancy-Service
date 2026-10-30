import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { RateItemRequest } from './rate-item.request.dto';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { BuildingRatePoliciesBatchCommand } from '../../../application/commands/building-rate-policies-batch/building-rate-policies-batch.command';

export class BatchBuildingRatePoliciesRequest {
  @ApiProperty({ type: [RateItemRequest], minItems: 1 })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RateItemRequest)
  rates: RateItemRequest[];

  static toCommand(
    request: BatchBuildingRatePoliciesRequest,
    buildingId: Uuid,
    landlordId: Uuid,
  ): BuildingRatePoliciesBatchCommand {
    return new BuildingRatePoliciesBatchCommand(
      landlordId,
      buildingId,
      RateItemRequest.toDomain(request.rates),
    );
  }
}
