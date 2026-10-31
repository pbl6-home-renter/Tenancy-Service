import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { CONTRACT_DI_TOKEN } from '../../../contract.di-token';
import type { ContractReadRepository } from '../../../domain/repositories/contract-read.repository';
import { ContractListQuery } from './contract-list.query';
import { ContractListResult } from './contract-list.result';

@QueryHandler(ContractListQuery)
export class ContractListQueryHandler implements IQueryHandler<
  ContractListQuery,
  PaginatedResult<ContractListResult>
> {
  constructor(
    @Inject(CONTRACT_DI_TOKEN.READ_REPOSITORY)
    private readonly contractReadRepository: ContractReadRepository,
  ) {}

  execute(
    query: ContractListQuery,
  ): Promise<PaginatedResult<ContractListResult>> {
    return this.contractReadRepository.findPageByLandlord(
      query.landlordId,
      query.options,
    );
  }
}
