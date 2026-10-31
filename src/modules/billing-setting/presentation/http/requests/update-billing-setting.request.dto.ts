import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, Max, Min, ValidateIf } from 'class-validator';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { BillingSettingUpdateCommand } from '../../../application/commands/billing-setting-update/billing-setting-update.command';

export class UpdateBillingSettingRequest {
  @ApiPropertyOptional({ minimum: 1, maximum: 28 })
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

  @ApiPropertyOptional({ type: Boolean })
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsBoolean()
  botEnabled?: boolean;

  @ApiPropertyOptional({ type: Boolean })
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsBoolean()
  isActive?: boolean;

  static toCommand(
    request: UpdateBillingSettingRequest,
    settingId: Uuid,
    landlordId: Uuid,
  ): BillingSettingUpdateCommand {
    if (
      request.paymentDueDay === undefined &&
      request.remindDay === undefined &&
      request.botEnabled === undefined &&
      request.isActive === undefined
    ) {
      throw new ValidationException(
        'At least one billing setting field is required',
      );
    }
    return new BillingSettingUpdateCommand(
      landlordId,
      settingId,
      request.paymentDueDay,
      request.remindDay,
      request.botEnabled,
      request.isActive,
    );
  }
}
