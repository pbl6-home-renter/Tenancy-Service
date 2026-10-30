import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { RatePolicyPageQueryPort } from '../../ports/rate-policy-page-query.port';
import { RatePolicyEntity } from '../../../domain/entities/rate-policy.entity';
import { RATE_POLICY_DI_TOKEN } from '../../../rate-policy.di-token';
import { RatePolicyListQuery } from './rate-policy-list.query';

@QueryHandler(RatePolicyListQuery)
export class RatePolicyListQueryHandler implements IQueryHandler<
  RatePolicyListQuery,
  PaginatedResult<RatePolicyEntity>
> {
  constructor(
    @Inject(RATE_POLICY_DI_TOKEN.PAGE_QUERY)
    private readonly policies: RatePolicyPageQueryPort,
  ) {}
  execute(
    query: RatePolicyListQuery,
  ): Promise<PaginatedResult<RatePolicyEntity>> {
    return this.policies.findPage(query.landlordId, query.options);
  }
}
