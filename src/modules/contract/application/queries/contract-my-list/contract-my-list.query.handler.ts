import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { CONTRACT_DI_TOKEN } from '../../../contract.di-token';
import type {
  ContractMyListResult,
  ContractReadRepository,
} from '../../../domain/repositories/contract-read.repository';
import { ContractMyListQuery } from './contract-my-list.query';

@QueryHandler(ContractMyListQuery)
export class ContractMyListQueryHandler implements IQueryHandler<
  ContractMyListQuery,
  PaginatedResult<ContractMyListResult>
> {
  constructor(
    @Inject(CONTRACT_DI_TOKEN.READ_REPOSITORY)
    private readonly contractReadRepository: ContractReadRepository,
  ) {}

  execute(
    query: ContractMyListQuery,
  ): Promise<PaginatedResult<ContractMyListResult>> {
    return this.contractReadRepository.findPageByTenant(
      query.tenantId,
      query.options,
    );
  }
}
