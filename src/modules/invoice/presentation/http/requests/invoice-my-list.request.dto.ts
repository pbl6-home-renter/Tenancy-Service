import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
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
import { InvoiceMyListFilter } from '../../../application/ports/invoice-read.port';

export class InvoiceMyListFilterRequest implements InvoiceMyListFilter {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUuid()
  contractId?: Uuid;

  @ApiPropertyOptional({ pattern: ReadingPeriod.PATTERN.source })
  @IsOptional()
  @Matches(ReadingPeriod.PATTERN)
  period?: string;
}

export class InvoiceMyListRequest extends OffsetPaginationQueryRequestDto<InvoiceMyListFilterRequest> {
  @ApiPropertyOptional({ type: InvoiceMyListFilterRequest })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => InvoiceMyListFilterRequest)
  override filter?: InvoiceMyListFilterRequest = undefined;

  @ApiPropertyOptional({ enum: ['period'], default: 'period' })
  @IsOptional()
  @IsIn(['period'])
  override sort?: string = undefined;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  override order?: 'asc' | 'desc' = undefined;
}
