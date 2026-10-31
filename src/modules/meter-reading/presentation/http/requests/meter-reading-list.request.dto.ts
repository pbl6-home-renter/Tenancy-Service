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

export class MeterReadingListFilterRequest {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUuid()
  roomId?: Uuid;

  @ApiPropertyOptional({ enum: MeterType })
  @IsOptional()
  @IsEnum(MeterType)
  type?: MeterType;

  @ApiPropertyOptional({ pattern: '^[0-9]{4}-(0[1-9]|1[0-2])$' })
  @IsOptional()
  @Matches(/^[0-9]{4}-(0[1-9]|1[0-2])$/)
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
