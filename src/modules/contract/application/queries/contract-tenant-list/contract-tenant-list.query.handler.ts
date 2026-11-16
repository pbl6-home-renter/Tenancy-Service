import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { CONTRACT_DI_TOKEN } from '../../../contract.di-token';
import { ContractTenantReadPort } from '../../ports/contract-tenant-read.port';
import { ContractTenantListQuery } from './contract-tenant-list.query';
import { ContractTenantListResult } from './contract-tenant-list.result';

@QueryHandler(ContractTenantListQuery)
export class ContractTenantListQueryHandler implements IQueryHandler<
  ContractTenantListQuery,
  PaginatedResult<ContractTenantListResult>
> {
  constructor(
    @Inject(CONTRACT_DI_TOKEN.TENANT_READ)
    private readonly read: ContractTenantReadPort,
  ) {}

  execute(
    query: ContractTenantListQuery,
  ): Promise<PaginatedResult<ContractTenantListResult>> {
    return this.read.findPage(query.landlordId, query.options);
  }
}
