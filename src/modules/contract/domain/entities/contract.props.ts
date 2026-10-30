import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ContractStatus } from '../enums/contract-status.enum';

export interface CreateContractProps {
  landlordId: Uuid;
  roomId: Uuid;
  tenantId: Uuid | null;
  tenantName: string | null;
  tenantPhone: string | null;
  depositAmount: number;
  rentPrice: number;
  startDate: string;
  endDate: string;
  vehicleCount: number | null;
}

export interface ContractProps extends CreateContractProps {
  id: Uuid;
  status: ContractStatus;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

export interface UpdateContractProps {
  description: string | null;
}
