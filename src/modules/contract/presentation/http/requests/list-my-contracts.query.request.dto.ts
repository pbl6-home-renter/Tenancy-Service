import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { OffsetPaginationQueryRequestDto } from 'shared/presentation/pagination/offset-pagination.request.dto';
import { IsUuid } from 'shared/presentation/validators/is-uuid.decorator';
import { ContractMyListQuery } from '../../../application/queries/contract-my-list/contract-my-list.query';
import { ContractStatus } from '../../../domain/enums/contract-status.enum';
import { ContractListFilter } from '../../../domain/repositories/contract.repository';

export class ContractMyListFilterRequestDto implements ContractListFilter {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUuid()
  roomId?: Uuid;

  @ApiPropertyOptional({ enum: ContractStatus })
  @IsOptional()
  @IsEnum(ContractStatus)
  status?: ContractStatus;
}

export class ListMyContractsQueryRequestDto extends OffsetPaginationQueryRequestDto<ContractListFilter> {
  static readonly unexpectedFieldCode = 'VALIDATION_FAILED';

  @ApiPropertyOptional({ type: ContractMyListFilterRequestDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ContractMyListFilterRequestDto)
  override filter?: ContractMyListFilterRequestDto = undefined;

  @ApiPropertyOptional({ enum: ['startDate'], default: 'startDate' })
  @IsOptional()
  @IsString()
  @IsIn(['startDate'])
  override sort = 'startDate';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  override order: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({ enum: ['json'], default: 'json' })
  @IsOptional()
  @IsIn(['json'])
  format = 'json';

  static toQuery(
    request: ListMyContractsQueryRequestDto,
    tenantId: Uuid,
  ): ContractMyListQuery {
    return new ContractMyListQuery(tenantId, request);
  }
}
