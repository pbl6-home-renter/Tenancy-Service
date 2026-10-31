import { OffsetPageQuery } from 'shared/application/pagination/offset-page-query';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { BillingSettingEntity } from '../../domain/entities/billing-setting.entity';
import { BillingSettingScope } from '../../domain/enums/billing-setting-scope.enum';

export interface BillingSettingPageFilter {
  scope?: BillingSettingScope;
  buildingId?: Uuid;
  roomId?: Uuid;
}

export interface BillingSettingPageQueryPort {
  findPage(
    landlordId: Uuid,
    query: OffsetPageQuery<BillingSettingPageFilter>,
  ): Promise<PaginatedResult<BillingSettingEntity>>;
}
