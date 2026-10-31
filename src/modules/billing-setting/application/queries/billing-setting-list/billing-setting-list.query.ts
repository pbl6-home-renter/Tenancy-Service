import { IQuery } from '@nestjs/cqrs';
import { OffsetPageQuery } from 'shared/application/pagination/offset-page-query';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { BillingSettingPageFilter } from '../../ports/billing-setting-page-query.port';

export class BillingSettingListQuery implements IQuery {
  constructor(
    readonly landlordId: Uuid,
    readonly options: OffsetPageQuery<BillingSettingPageFilter>,
  ) {}
}
