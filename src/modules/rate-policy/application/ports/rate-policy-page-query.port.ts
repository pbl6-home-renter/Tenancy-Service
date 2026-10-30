import { OffsetPageQuery } from 'shared/application/pagination/offset-page-query';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { RatePolicyEntity } from '../../domain/entities/rate-policy.entity';
import { RatePolicyScope } from '../../domain/enums/rate-policy-scope.enum';
import { RateType } from '../../domain/enums/rate-type.enum';

export interface RatePolicyPageFilter {
  scope?: RatePolicyScope;
  roomId?: Uuid;
  buildingId?: Uuid;
  type?: RateType;
}

export interface RatePolicyPageQueryPort {
  findPage(
    landlordId: Uuid,
    query: OffsetPageQuery<RatePolicyPageFilter>,
  ): Promise<PaginatedResult<RatePolicyEntity>>;
}
