import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { ContractTenantScope } from '../../../application/ports/contract-tenant-read.port';

export class ContractTenantListFilterRequestDto {
  @ApiPropertyOptional({ enum: ['current', 'history'], default: 'current' })
  @IsOptional()
  @IsIn(['current', 'history'])
  scope?: ContractTenantScope;
}
