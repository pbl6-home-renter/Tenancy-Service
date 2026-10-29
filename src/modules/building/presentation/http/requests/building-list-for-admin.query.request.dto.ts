import { BuildingListForAdminQuery } from '../../../application/queries/building-list-for-admin/building-list-for-admin.query';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { OffsetPaginationQueryRequestDto } from 'shared/presentation/pagination/offset-pagination.request.dto';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { AdminBuildingFilter } from '../../../domain/repositories/building.repository';
import { BuildingStatus } from '../../../domain/enums/building-status.enum';

export class AdminBuildingFilterRequestDto implements AdminBuildingFilter {
  @ApiPropertyOptional({ enum: BuildingStatus })
  @IsOptional()
  @IsIn(Object.values(BuildingStatus))
  status?: BuildingStatus;

  @ApiPropertyOptional({ type: String, format: 'uuid' })
  @IsOptional()
  @IsUUID()
  landlordId?: Uuid;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  province?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ward?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;
}

export class BuildingListForAdminQueryRequestDto extends OffsetPaginationQueryRequestDto<AdminBuildingFilter> {
  @ApiPropertyOptional({ type: 'integer', minimum: 1, default: 1 })
  override pageNo: number = 1;

  @ApiPropertyOptional({
    type: 'integer',
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  override pageSize: number = 20;

  @ApiPropertyOptional({ type: AdminBuildingFilterRequestDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => AdminBuildingFilterRequestDto)
  override filter?: AdminBuildingFilterRequestDto = undefined;

  @ApiPropertyOptional({
    enum: ['createdAt', 'name', 'status'],
    default: 'createdAt',
  })
  @IsOptional()
  @IsString()
  @IsIn(['createdAt', 'name', 'status'])
  override sort?: string = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'asc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  override order?: 'asc' | 'desc' = 'asc';

  @ApiPropertyOptional({ enum: ['json'], default: 'json' })
  @IsOptional()
  @IsIn(['json'])
  format = 'json' as const;

  static toQuery(
    request: BuildingListForAdminQueryRequestDto,
  ): BuildingListForAdminQuery {
    return new BuildingListForAdminQuery(request);
  }
}
