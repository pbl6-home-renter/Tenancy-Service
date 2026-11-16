import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsObject, IsOptional, ValidateNested } from 'class-validator';
import { OffsetPaginationQueryRequestDto } from 'shared/presentation/pagination/offset-pagination.request.dto';
import { ContractTenantListFilterRequestDto } from './contract-tenant-list-filter.request.dto';

export class ContractTenantListRequestDto extends OffsetPaginationQueryRequestDto<ContractTenantListFilterRequestDto> {
  @ApiPropertyOptional({ type: ContractTenantListFilterRequestDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ContractTenantListFilterRequestDto)
  override filter?: ContractTenantListFilterRequestDto = undefined;

  @ApiPropertyOptional({ enum: ['tenantName'], default: 'tenantName' })
  @IsOptional()
  @IsIn(['tenantName'])
  override sort?: string = undefined;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'asc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  override order?: 'asc' | 'desc' = undefined;
}
