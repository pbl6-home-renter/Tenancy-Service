import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { OffsetPaginationQueryRequestDto } from 'shared/presentation/pagination/offset-pagination.request.dto';
import { MyBuildingFilter } from '../../../domain/repositories/building.repository';
import { BuildingStatus } from '../../../domain/enums/building-status.enum';

export class MyBuildingFilterRequestDto implements MyBuildingFilter {
  @ApiPropertyOptional({ enum: BuildingStatus })
  @IsOptional()
  @IsIn(Object.values(BuildingStatus))
  status?: BuildingStatus;
}

export class BuildingListMineQueryRequestDto extends OffsetPaginationQueryRequestDto<MyBuildingFilter> {
  @ApiPropertyOptional({ type: MyBuildingFilterRequestDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => MyBuildingFilterRequestDto)
  override filter?: MyBuildingFilterRequestDto = undefined;

  @ApiPropertyOptional({
    enum: ['createdAt', 'name', 'status'],
    default: 'createdAt',
  })
  @IsOptional()
  @IsString()
  @IsIn(['createdAt', 'name', 'status'])
  override sort?: string = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  override order?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({ enum: ['json'], default: 'json' })
  @IsOptional()
  @IsIn(['json'])
  format = 'json' as const;
}
