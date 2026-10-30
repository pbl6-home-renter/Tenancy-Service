import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import { BillingUnit } from '../../../domain/enums/billing-unit.enum';
import { RateKind } from '../../../domain/enums/rate-kind.enum';
import { RateType } from '../../../domain/enums/rate-type.enum';
import { RateItem } from '../../../domain/value-objects/rate-item.vo';
import { RatePrice } from '../../../domain/value-objects/rate-price.vo';

export class RateStepRequest {
  @ApiProperty({ type: 'integer', minimum: 0 })
  @IsInt()
  @Min(0)
  from: number;

  @ApiProperty({ type: 'integer', minimum: 0, nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  to: number | null;

  @ApiProperty({ type: String, pattern: RatePrice.PATTERN.source })
  @IsString()
  @Matches(RatePrice.PATTERN)
  price: string;
}

export class RateItemRequest {
  @ApiProperty({ enum: RateType })
  @IsEnum(RateType)
  type: RateType;

  @ApiProperty({ minLength: 1, maxLength: 100 })
  @IsString()
  @Length(1, 100)
  name: string;

  @ApiProperty({ enum: RateKind })
  @IsEnum(RateKind, { message: 'INVALID_RATE_KIND' })
  rateKind: RateKind;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    pattern: RatePrice.PATTERN.source,
  })
  @IsOptional()
  @IsString()
  @Matches(RatePrice.PATTERN)
  unitPrice?: string | null;

  @ApiPropertyOptional({ type: [RateStepRequest], nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RateStepRequest)
  steps?: RateStepRequest[] | null;

  @ApiProperty({ enum: BillingUnit })
  @IsEnum(BillingUnit)
  billingUnit: BillingUnit;

  static toDomain(requests: RateItemRequest[]): RateItem[] {
    return requests.map((rate) =>
      RateItem.create({
        type: rate.type,
        name: rate.name,
        rateKind: rate.rateKind,
        unitPrice: rate.unitPrice ?? null,
        steps:
          rate.steps?.map((step) => ({
            from: step.from,
            to: step.to,
            price: step.price,
          })) ?? null,
        billingUnit: rate.billingUnit,
      }),
    );
  }
}
