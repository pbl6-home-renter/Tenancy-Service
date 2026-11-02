import { OffsetPageQuery } from 'shared/application/pagination/offset-page-query';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { BaseRepository } from 'shared/domain/repositories/base.repository';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ContractMember } from '../entities/contract-member.entity';

export interface ContractMemberRepository extends BaseRepository<ContractMember> {
  findById(
    id: Uuid,
    context?: TransactionContext,
  ): Promise<ContractMember | null>;
  findByIdForUpdate(
    id: Uuid,
    context: TransactionContext,
  ): Promise<ContractMember | null>;
  findByTenantAndContractForUpdate(
    tenantId: Uuid,
    contractId: Uuid,
    context: TransactionContext,
  ): Promise<ContractMember | null>;
  findActiveByContract(
    contractId: Uuid,
    context?: TransactionContext,
  ): Promise<ContractMember[]>;
  existsActiveByContractAndTenant(
    contractId: Uuid,
    tenantId: Uuid,
    context?: TransactionContext,
  ): Promise<boolean>;
  existsActiveDuplicate(
    contractId: Uuid,
    match: {
      tenantId: Uuid | null;
      tenantPhone: string | null;
      excludeId?: Uuid;
    },
    context?: TransactionContext,
  ): Promise<boolean>;
  findPageByContract(
    contractId: Uuid,
    query: OffsetPageQuery,
  ): Promise<PaginatedResult<ContractMember>>;
  countHeadsInPeriod(
    contractId: Uuid,
    periodStart: string,
    periodEnd: string,
    context?: TransactionContext,
  ): Promise<number>;
}
