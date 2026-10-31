import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { BILLING_SETTING_DI_TOKEN } from '../../../billing-setting.di-token';
import { BillingSettingPageQueryPort } from '../../ports/billing-setting-page-query.port';
import { BillingSettingEntity } from '../../../domain/entities/billing-setting.entity';
import { BillingSettingListQuery } from './billing-setting-list.query';

@QueryHandler(BillingSettingListQuery)
export class BillingSettingListQueryHandler implements IQueryHandler<
  BillingSettingListQuery,
  PaginatedResult<BillingSettingEntity>
> {
  constructor(
    @Inject(BILLING_SETTING_DI_TOKEN.PAGE_QUERY)
    private readonly settings: BillingSettingPageQueryPort,
  ) {}
  execute(
    query: BillingSettingListQuery,
  ): Promise<PaginatedResult<BillingSettingEntity>> {
    return this.settings.findPage(query.landlordId, query.options);
  }
}
