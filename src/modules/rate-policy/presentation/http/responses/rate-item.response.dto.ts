import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BillingUnit } from '../../../domain/enums/billing-unit.enum';
import { RateKind } from '../../../domain/enums/rate-kind.enum';
import { RateType } from '../../../domain/enums/rate-type.enum';
import { RateItemProps } from '../../../domain/value-objects/rate-item.vo';
import { RateStepResponseDto } from './rate-step.response.dto';

export class RateItemResponseDto implements RateItemProps {
  @ApiProperty({ enum: RateType })
  type: RateType;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: RateKind })
  rateKind: RateKind;

  @ApiPropertyOptional({ type: String, nullable: true })
  unitPrice: string | null;

  @ApiPropertyOptional({ type: [RateStepResponseDto], nullable: true })
  steps: RateStepResponseDto[] | null;

  @ApiProperty({ enum: BillingUnit })
  billingUnit: BillingUnit;
}
