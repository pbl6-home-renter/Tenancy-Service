import { OffsetPageQuery } from 'shared/application/pagination/offset-page-query';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { ContractTemplateEntity } from '../entities/contract-template.entity';

export interface ContractTemplateRepository {
  findActivePage(
    query: OffsetPageQuery,
  ): Promise<PaginatedResult<ContractTemplateEntity>>;
  findByKey(
    templateKey: string,
    context?: TransactionContext,
  ): Promise<ContractTemplateEntity | null>;
}
