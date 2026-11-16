import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ContractTenantScope } from '../../ports/contract-tenant-read.port';

export interface ContractTenantListResult {
  contractMemberId: Uuid;
  tenantName: string | null;
  isLinked: boolean;
  scope: ContractTenantScope;
  contractCount: number;
}
