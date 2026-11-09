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
import { ReadingPeriod } from 'modules/meter-reading/domain/value-objects/reading-period.vo';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { OffsetPaginationQueryRequestDto } from 'shared/presentation/pagination/offset-pagination.request.dto';
import { IsUuid } from 'shared/presentation/validators/is-uuid.decorator';
import { InvoiceListFilter } from '../../../application/ports/invoice-read.port';
import { InvoiceStatus } from '../../../domain/enums/invoice-status.enum';

export class InvoiceListFilterRequest implements InvoiceListFilter {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUuid()
  buildingId?: Uuid;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUuid()
  roomId?: Uuid;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUuid()
  contractId?: Uuid;

  @ApiPropertyOptional({ pattern: ReadingPeriod.PATTERN.source })
  @IsOptional()
  @Matches(ReadingPeriod.PATTERN)
  period?: string;

  @ApiPropertyOptional({ enum: InvoiceStatus })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;
}

export class InvoiceListRequest extends OffsetPaginationQueryRequestDto<InvoiceListFilterRequest> {
  @ApiPropertyOptional({ type: InvoiceListFilterRequest })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => InvoiceListFilterRequest)
  override filter?: InvoiceListFilterRequest = undefined;

  @ApiPropertyOptional({ enum: ['period', 'createdAt'], default: 'period' })
  @IsOptional()
  @IsIn(['period', 'createdAt'])
  override sort?: string = undefined;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  override order?: 'asc' | 'desc' = undefined;
}
