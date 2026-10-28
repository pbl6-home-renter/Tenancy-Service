import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
  Validate,
  ValidateNested,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { OffsetPaginationQueryRequestDto } from 'shared/presentation/pagination/offset-pagination.request.dto';
import { GenderPolicy } from '../../../domain/enums/gender-policy.enum';
import { RoomPublicSearchQuery } from '../../../application/queries/room-public-search/room-public-search.query';
import { PublicRoomFilter } from '../../../application/queries/room-public-search/room-public-search.query';

const publicRoomSortFields = ['rentPrice', 'createdAt', 'area'] as const;

@ValidatorConstraint({ name: 'validPublicRoomPriceRange', async: false })
class PublicRoomPriceRangeConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'object' || value === null) return true;
    const filter = value as PublicRoomFilterRequest;
    return (
      filter.minPrice === undefined ||
      filter.maxPrice === undefined ||
      filter.minPrice <= filter.maxPrice
    );
  }

  defaultMessage(): string {
    return 'VALIDATION_FAILED';
  }
}

export class PublicRoomFilterRequest implements PublicRoomFilter {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  province?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ward?: string;

  @ApiPropertyOptional({ minimum: 0, type: 'integer' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ minimum: 0, type: 'integer' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ enum: GenderPolicy })
  @IsOptional()
  @IsEnum(GenderPolicy)
  genderPolicy?: GenderPolicy;
}

export class PublicRoomsQueryRequest extends OffsetPaginationQueryRequestDto<PublicRoomFilterRequest> {
  @ApiPropertyOptional({
    type: PublicRoomFilterRequest,
    description:
      'Filter by province, ward, rent price range and gender policy using deepObject query parameters.',
  })
  @IsOptional()
  @IsObject()
  @Validate(PublicRoomPriceRangeConstraint)
  @ValidateNested()
  @Type(() => PublicRoomFilterRequest)
  override filter?: PublicRoomFilterRequest = undefined;

  @ApiPropertyOptional({ enum: publicRoomSortFields, default: 'rentPrice' })
  @IsOptional()
  @IsString()
  @IsIn(publicRoomSortFields)
  override sort?: string = undefined;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'asc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  override order?: 'asc' | 'desc' = undefined;

  @ApiPropertyOptional({ enum: ['json'], default: 'json' })
  @IsOptional()
  @IsIn(['json'])
  format = 'json' as const;

  static toQuery(request: PublicRoomsQueryRequest): RoomPublicSearchQuery {
    return new RoomPublicSearchQuery(request);
  }
}
