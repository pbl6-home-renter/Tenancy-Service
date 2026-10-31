import { OffsetPageQuery } from 'shared/application/pagination/offset-page-query';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ContractStatus } from '../enums/contract-status.enum';
import { ContractListFilter } from './contract.repository';

export interface ContractListResult {
  id: Uuid;
  roomId: Uuid;
  roomName: string;
  tenantName: string | null;
  tenantPhone: string | null;
  status: ContractStatus;
  rentPrice: number;
  depositAmount: number;
  startDate: string;
  endDate: string;
}

export interface ContractReadRepository {
  findPageByLandlord(
    landlordId: Uuid,
    query: OffsetPageQuery<ContractListFilter>,
  ): Promise<PaginatedResult<ContractListResult>>;
}
