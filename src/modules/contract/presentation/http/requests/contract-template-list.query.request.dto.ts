import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { ContractTemplateListQuery } from '../../../application/queries/contract-template-list/contract-template-list.query';

export class ContractTemplateListQueryRequestDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageNo: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;

  static toQuery(
    request: ContractTemplateListQueryRequestDto,
  ): ContractTemplateListQuery {
    return new ContractTemplateListQuery(request);
  }
}
