import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { CONTRACT_DI_TOKEN } from '../../../contract.di-token';
import { ContractTemplateEntity } from '../../../domain/entities/contract-template.entity';
import { ContractTemplateNotFoundException } from '../../../domain/exceptions/contract-template-not-found.exception';
import { ContractTemplateRepository } from '../../../domain/repositories/contract-template.repository';
import { ContractTemplateGetQuery } from './contract-template-get.query';

@QueryHandler(ContractTemplateGetQuery)
export class ContractTemplateGetQueryHandler implements IQueryHandler<
  ContractTemplateGetQuery,
  ContractTemplateEntity
> {
  constructor(
    @Inject(CONTRACT_DI_TOKEN.TEMPLATE_REPOSITORY)
    private readonly templateRepository: ContractTemplateRepository,
  ) {}

  async execute(
    query: ContractTemplateGetQuery,
  ): Promise<ContractTemplateEntity> {
    const template = await this.templateRepository.findByKey(query.templateKey);
    if (!template || !template.isActive) {
      throw new ContractTemplateNotFoundException(query.templateKey);
    }
    return template;
  }
}
