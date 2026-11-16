import { OffsetPageQuery } from 'shared/application/pagination/offset-page-query';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ContractTenantListResult } from '../queries/contract-tenant-list/contract-tenant-list.result';
import { ContractTenantGetByIdResult } from '../queries/contract-tenant-get-by-id/contract-tenant-get-by-id.result';

export type ContractTenantScope = 'current' | 'history';

export interface ContractTenantFilter {
  scope?: ContractTenantScope;
}

export interface ContractTenantReadPort {
  findPage(
    landlordId: Uuid,
    options: OffsetPageQuery<ContractTenantFilter>,
  ): Promise<PaginatedResult<ContractTenantListResult>>;
  findByMemberId(
    landlordId: Uuid,
    contractMemberId: Uuid,
  ): Promise<ContractTenantGetByIdResult | null>;
}
