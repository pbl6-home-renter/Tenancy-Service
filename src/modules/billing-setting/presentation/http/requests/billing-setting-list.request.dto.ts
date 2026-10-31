import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsObject, IsOptional, ValidateNested } from 'class-validator';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { OffsetPaginationQueryRequestDto } from 'shared/presentation/pagination/offset-pagination.request.dto';
import { IsUuid } from 'shared/presentation/validators/is-uuid.decorator';
import { BillingSettingScope } from '../../../domain/enums/billing-setting-scope.enum';

export class BillingSettingListFilterRequest {
  @ApiPropertyOptional({ enum: BillingSettingScope })
  @IsOptional()
  @IsEnum(BillingSettingScope)
  scope?: BillingSettingScope;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUuid()
  buildingId?: Uuid;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUuid()
  roomId?: Uuid;
}

export class BillingSettingListRequest extends OffsetPaginationQueryRequestDto<BillingSettingListFilterRequest> {
  @ApiPropertyOptional({ type: BillingSettingListFilterRequest })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => BillingSettingListFilterRequest)
  override filter?: BillingSettingListFilterRequest = undefined;
}
