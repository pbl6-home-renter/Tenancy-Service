import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export interface AddContractMemberProps {
  contractId: Uuid;
  tenantId: Uuid | null;
  tenantName: string | null;
  tenantPhone: string | null;
  joinedAt: Date;
}

export interface ContractMemberProps extends AddContractMemberProps {
  id: Uuid;
  leftAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}
