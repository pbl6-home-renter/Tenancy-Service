import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { BuildingListMineQuery } from '../../../application/queries/building-list-mine/building-list-mine.query';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
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

  @ApiPropertyOptional({ type: String, maxLength: 100 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() || undefined : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
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

  static toQuery(
    request: BuildingListMineQueryRequestDto,
    landlordId: Uuid,
  ): BuildingListMineQuery {
    return new BuildingListMineQuery(landlordId, request);
  }
}
