import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { IsUuid } from 'shared/presentation/validators/is-uuid.decorator';
import { BillingSettingCreateCommand } from '../../../application/commands/billing-setting-create/billing-setting-create.command';
import { BillingSettingScope } from '../../../domain/enums/billing-setting-scope.enum';

export class CreateBillingSettingRequest {
  @ApiProperty({ enum: BillingSettingScope })
  @IsEnum(BillingSettingScope)
  scope: BillingSettingScope;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Required only for building scope',
  })
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsUuid()
  buildingId?: Uuid;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Required only for room scope',
  })
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsUuid()
  roomId?: Uuid;

  @ApiPropertyOptional({ minimum: 1, maximum: 28, default: 5 })
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsInt()
  @Min(1)
  @Max(28)
  paymentDueDay?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 28, nullable: true })
  @ValidateIf((_, value: unknown) => value !== undefined && value !== null)
  @IsInt()
  @Min(1)
  @Max(28)
  remindDay?: number | null;

  @ApiPropertyOptional({ type: Boolean, default: true })
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsBoolean()
  botEnabled?: boolean;

  static toCommand(
    request: CreateBillingSettingRequest,
    landlordId: Uuid,
  ): BillingSettingCreateCommand {
    return new BillingSettingCreateCommand(
      landlordId,
      request.scope,
      request.buildingId,
      request.roomId,
      request.paymentDueDay,
      request.remindDay,
      request.botEnabled,
    );
  }
}
