import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoommateProfileSaveInput } from '../../application/commands/roommate-profile-save/roommate-profile-save.command';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class LifestyleRequest {
  @IsOptional()
  @IsBoolean()
  cleanAndTidy?: boolean;

  @IsOptional()
  @IsBoolean()
  earlyBird?: boolean;

  @IsOptional()
  @IsBoolean()
  nightOwl?: boolean;

  @IsOptional()
  @IsBoolean()
  petFriendly?: boolean;

  @IsOptional()
  @IsBoolean()
  smoking?: boolean;

  @IsOptional()
  @IsBoolean()
  cooking?: boolean;

  @IsOptional()
  @IsBoolean()
  guestsAllowed?: boolean;
}

export class RoommateProfileSaveRequest implements RoommateProfileSaveInput {
  @ApiProperty()
  @IsBoolean()
  isVisible: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string | null;

  @ApiPropertyOptional({ enum: ['male', 'female', 'other'] })
  @IsOptional()
  @IsIn(['male', 'female', 'other'])
  gender?: string | null;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2100)
  birthYear?: number | null;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  occupation?: string | null;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  preferredProvince?: string | null;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  preferredDistrict?: string | null;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  preferredArea?: string | null;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(999_999_999_999_999)
  budgetMin?: number | null;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(999_999_999_999_999)
  budgetMax?: number | null;
  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  moveInOn?: string | null;
  @ApiPropertyOptional({ type: LifestyleRequest })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => LifestyleRequest)
  lifestyle?: LifestyleRequest | null;
}

export class RoommateProfileFilter {
  @IsOptional() @IsString() @MaxLength(255) preferredArea?: string;
}

export class RoommateProfileSearchRequest {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageNo = 1;
  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;
  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => RoommateProfileFilter)
  filter?: RoommateProfileFilter;
}
