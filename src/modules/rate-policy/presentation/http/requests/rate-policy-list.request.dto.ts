import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsObject,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { OffsetPaginationQueryRequestDto } from 'shared/presentation/pagination/offset-pagination.request.dto';
import { IsUuid } from 'shared/presentation/validators/is-uuid.decorator';
import { RatePolicyScope } from '../../../domain/enums/rate-policy-scope.enum';
import { RateType } from '../../../domain/enums/rate-type.enum';

export class RatePolicyListFilterRequest {
  @ApiPropertyOptional({ enum: RatePolicyScope })
  @IsOptional()
  @IsEnum(RatePolicyScope)
  scope?: RatePolicyScope;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUuid()
  buildingId?: Uuid;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUuid()
  roomId?: Uuid;

  @ApiPropertyOptional({ enum: RateType })
  @IsOptional()
  @IsEnum(RateType)
  type?: RateType;
}

export class RatePolicyListRequest extends OffsetPaginationQueryRequestDto<RatePolicyListFilterRequest> {
  @ApiPropertyOptional({ type: RatePolicyListFilterRequest })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => RatePolicyListFilterRequest)
  override filter?: RatePolicyListFilterRequest = undefined;

  @ApiPropertyOptional({ enum: ['createdAt'], default: 'createdAt' })
  @IsOptional()
  @IsIn(['createdAt'])
  override sort?: string = undefined;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  override order?: 'asc' | 'desc' = undefined;
}
