import { ApiProperty } from '@nestjs/swagger';
import { BillingSettingEntity } from '../../../domain/entities/billing-setting.entity';
import { BillingSettingScope } from '../../../domain/enums/billing-setting-scope.enum';

export class BillingSettingResponseDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ format: 'uuid' }) landlordId: string;
  @ApiProperty({ enum: BillingSettingScope }) scope: BillingSettingScope;
  @ApiProperty({ format: 'uuid' }) buildingId: string;
  @ApiProperty({ format: 'uuid', nullable: true }) roomId: string | null;
  @ApiProperty({ minimum: 1, maximum: 28 }) paymentDueDay: number;
  @ApiProperty({ minimum: 1, maximum: 28, nullable: true }) remindDay:
    number | null;
  @ApiProperty({ type: Boolean }) botEnabled: boolean;
  @ApiProperty({ type: Boolean }) isActive: boolean;
  @ApiProperty({ format: 'date-time' }) createdAt: Date;
  @ApiProperty({ format: 'date-time' }) updatedAt: Date;

  static fromDomain(setting: BillingSettingEntity): BillingSettingResponseDto {
    const response = new BillingSettingResponseDto();
    response.id = setting.id;
    response.landlordId = setting.landlordId;
    response.scope = setting.scope;
    response.buildingId = setting.buildingId;
    response.roomId = setting.roomId;
    response.paymentDueDay = setting.paymentDueDay;
    response.remindDay = setting.remindDay;
    response.botEnabled = setting.botEnabled;
    response.isActive = setting.isActive;
    response.createdAt = setting.createdAt;
    response.updatedAt = setting.updatedAt;
    return response;
  }
}
