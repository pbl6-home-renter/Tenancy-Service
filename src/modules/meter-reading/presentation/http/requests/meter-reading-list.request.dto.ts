import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsObject,
  IsOptional,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { OffsetPaginationQueryRequestDto } from 'shared/presentation/pagination/offset-pagination.request.dto';
import { IsUuid } from 'shared/presentation/validators/is-uuid.decorator';
import { MeterType } from '../../../domain/enums/meter-type.enum';
import { ReadingPeriod } from '../../../domain/value-objects/reading-period.vo';

export class MeterReadingListFilterRequest {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUuid()
  roomId?: Uuid;

  @ApiPropertyOptional({ enum: MeterType })
  @IsOptional()
  @IsEnum(MeterType)
  type?: MeterType;

  @ApiPropertyOptional({ pattern: ReadingPeriod.PATTERN.source })
  @IsOptional()
  @Matches(ReadingPeriod.PATTERN)
  period?: string;
}

export class MeterReadingListRequest extends OffsetPaginationQueryRequestDto<MeterReadingListFilterRequest> {
  @ApiPropertyOptional({ type: MeterReadingListFilterRequest })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => MeterReadingListFilterRequest)
  override filter?: MeterReadingListFilterRequest = undefined;

  @ApiPropertyOptional({ enum: ['period', 'createdAt'], default: 'period' })
  @IsOptional()
  @IsIn(['period', 'createdAt'])
  override sort?: string = undefined;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  override order?: 'asc' | 'desc' = undefined;
}
