import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OffsetPageQuery } from 'shared/application/pagination/offset-page-query';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { TypeOrmOffsetPaginator } from 'shared/infrastructure/database/pagination/offset.paginator';
import { withTransaction } from 'shared/infrastructure/database/transaction/typeorm-transaction-context';
import { ContractTemplateEntity } from '../../domain/entities/contract-template.entity';
import { ContractTemplateRepository } from '../../domain/repositories/contract-template.repository';
import { ContractTemplateTypeormEntity } from './contract-template.entity';
import { ContractTemplateMapper } from './mappers/contract-template.mapper';

@Injectable()
export class TypeOrmContractTemplateRepository implements ContractTemplateRepository {
  constructor(
    @InjectRepository(ContractTemplateTypeormEntity)
    private readonly repository: Repository<ContractTemplateTypeormEntity>,
  ) {}

  async findActivePage(
    options: OffsetPageQuery,
  ): Promise<PaginatedResult<ContractTemplateEntity>> {
    const query = this.repository
      .createQueryBuilder('template')
      .where('template.isActive = true')
      .andWhere('template.isDeleted = false');
    return TypeOrmOffsetPaginator.of(query, options)
      .withSort({
        whitelist: ['createdAt'],
        defaultSort: 'createdAt',
        defaultOrder: 'desc',
        alias: 'template',
      })
      .paginate(ContractTemplateMapper.toDomain);
  }

  async findByKey(
    templateKey: string,
    context?: TransactionContext,
  ): Promise<ContractTemplateEntity | null> {
    const raw = await withTransaction(this.repository, context).findOne({
      where: { templateKey, isDeleted: false },
    });
    return raw ? ContractTemplateMapper.toDomain(raw) : null;
  }
}
