import { OffsetPageQuery } from 'shared/application/pagination/offset-page-query';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { RatePolicyEntity } from '../../domain/entities/rate-policy.entity';
import { RatePolicyScope } from '../../domain/enums/rate-policy-scope.enum';

export interface RatePolicyPageFilter extends Record<string, unknown> {
  scope?: RatePolicyScope;
  roomId?: Uuid;
  buildingId?: Uuid;
}

export interface RatePolicyPageQueryPort {
  findPage(
    landlordId: Uuid,
    query: OffsetPageQuery<RatePolicyPageFilter>,
  ): Promise<PaginatedResult<RatePolicyEntity>>;
}
