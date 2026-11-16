import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ContractStatus } from '../../../domain/enums/contract-status.enum';
import { ContractTenantListResult } from '../contract-tenant-list/contract-tenant-list.result';

export interface ContractTenantMembershipResult {
  contractMemberId: Uuid;
  contractId: Uuid;
  roomId: Uuid;
  contractStatus: ContractStatus;
  joinedAt: string;
  leftAt: string | null;
  isCurrent: boolean;
  tenantName: string | null;
  tenantPhone: string | null;
}

export interface ContractTenantGetByIdResult extends ContractTenantListResult {
  memberships: ContractTenantMembershipResult[];
}
