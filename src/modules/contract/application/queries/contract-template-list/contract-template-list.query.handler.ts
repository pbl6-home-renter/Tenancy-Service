import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { CONTRACT_DI_TOKEN } from '../../../contract.di-token';
import { ContractTemplateEntity } from '../../../domain/entities/contract-template.entity';
import { ContractTemplateRepository } from '../../../domain/repositories/contract-template.repository';
import { ContractTemplateListQuery } from './contract-template-list.query';

@QueryHandler(ContractTemplateListQuery)
export class ContractTemplateListQueryHandler implements IQueryHandler<
  ContractTemplateListQuery,
  PaginatedResult<ContractTemplateEntity>
> {
  constructor(
    @Inject(CONTRACT_DI_TOKEN.TEMPLATE_REPOSITORY)
    private readonly templateRepository: ContractTemplateRepository,
  ) {}

  execute(
    query: ContractTemplateListQuery,
  ): Promise<PaginatedResult<ContractTemplateEntity>> {
    return this.templateRepository.findActivePage(query.options);
  }
}
