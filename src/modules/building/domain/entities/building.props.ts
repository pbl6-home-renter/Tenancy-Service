import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { BuildingStatus } from '../enums/building-status.enum';

export interface CreateBuildingProps {
  landlordId: Uuid;
  name: string;
  province: string;
  ward: string;
  address: string;
  latitude: number;
  longitude: number;
}

export type UpdateBuildingProps = Partial<
  Omit<CreateBuildingProps, 'landlordId'>
>;

export interface BuildingProps extends CreateBuildingProps {
  id: Uuid;
  status: BuildingStatus;
  reviewedBy: Uuid | null;
  reviewedAt: Date | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}
