import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { OffsetPaginationQueryRequestDto } from 'shared/presentation/pagination/offset-pagination.request.dto';
import { BuildingSearchPublicQuery } from '../../../application/queries/building-search-public/building-search-public.query';
import { PublicBuildingFilter } from '../../../domain/repositories/building.repository';

export class PublicBuildingFilterRequestDto implements PublicBuildingFilter {
  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  province?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  ward?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}

export class BuildingSearchPublicQueryRequestDto extends OffsetPaginationQueryRequestDto<PublicBuildingFilter> {
  @ApiPropertyOptional({ type: PublicBuildingFilterRequestDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PublicBuildingFilterRequestDto)
  override filter?: PublicBuildingFilterRequestDto = undefined;

  @ApiPropertyOptional({ enum: ['createdAt', 'name'], default: 'createdAt' })
  @IsOptional()
  @IsString()
  @IsIn(['createdAt', 'name'])
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
    request: BuildingSearchPublicQueryRequestDto,
  ): BuildingSearchPublicQuery {
    return new BuildingSearchPublicQuery(request);
  }
}
