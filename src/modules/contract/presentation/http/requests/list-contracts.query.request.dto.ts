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
import { ContractListQuery } from '../../../application/queries/contract-list/contract-list.query';
import { ContractStatus } from '../../../domain/enums/contract-status.enum';
import { ContractListFilter } from '../../../domain/repositories/contract.repository';

export class ContractListFilterRequestDto implements ContractListFilter {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUuid()
  roomId?: Uuid;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUuid()
  buildingId?: Uuid;

  @ApiPropertyOptional({ enum: ContractStatus })
  @IsOptional()
  @IsEnum(ContractStatus)
  status?: ContractStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUuid()
  tenantId?: Uuid;
}

export class ListContractsQueryRequestDto extends OffsetPaginationQueryRequestDto<ContractListFilter> {
  @ApiPropertyOptional({ type: ContractListFilterRequestDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ContractListFilterRequestDto)
  override filter?: ContractListFilterRequestDto = undefined;

  @ApiPropertyOptional({ enum: ['createdAt'], default: 'createdAt' })
  @IsOptional()
  @IsString()
  @IsIn(['createdAt'])
  override sort?: string = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  override order?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({ enum: ['json'], default: 'json' })
  @IsOptional()
  @IsIn(['json'])
  format = 'json' as const;

  static toQuery(
    request: ListContractsQueryRequestDto,
    landlordId: Uuid,
  ): ContractListQuery {
    return new ContractListQuery(landlordId, request);
  }
}
