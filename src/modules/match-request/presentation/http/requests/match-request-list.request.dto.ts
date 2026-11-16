import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsObject,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { MatchRequestListFilterRequestDto } from './match-request-list-filter.request.dto';

export class MatchRequestListRequestDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageNo = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;

  @ApiPropertyOptional({ type: MatchRequestListFilterRequestDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => MatchRequestListFilterRequestDto)
  filter?: MatchRequestListFilterRequestDto;
}
