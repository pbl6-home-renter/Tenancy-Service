import { BaseRepository } from 'shared/domain/repositories/base.repository';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { OffsetPageQuery } from 'shared/application/pagination/offset-page-query';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { ContractEntity } from '../entities/contract.entity';
import { ContractStatus } from '../enums/contract-status.enum';

export interface ContractListFilter {
  roomId?: Uuid;
  buildingId?: Uuid;
  status?: ContractStatus;
  tenantId?: Uuid;
}

export interface ContractRepository extends BaseRepository<ContractEntity> {
  findById(
    id: Uuid,
    context?: TransactionContext,
  ): Promise<ContractEntity | null>;
  findByIdForUpdate(
    id: Uuid,
    context: TransactionContext,
  ): Promise<ContractEntity | null>;
  existsActiveByRoom(
    roomId: Uuid,
    context?: TransactionContext,
  ): Promise<boolean>;
  findPageByLandlord(
    landlordId: Uuid,
    query: OffsetPageQuery<ContractListFilter>,
  ): Promise<PaginatedResult<ContractEntity>>;
}
