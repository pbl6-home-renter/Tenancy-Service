import { IQuery } from '@nestjs/cqrs';
import { OffsetPageQuery } from 'shared/application/pagination/offset-page-query';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { RatePolicyPageFilter } from '../../ports/rate-policy-page-query.port';

export class RatePolicyListQuery implements IQuery {
  constructor(
    readonly landlordId: Uuid,
    readonly options: OffsetPageQuery<RatePolicyPageFilter>,
  ) {}
}
