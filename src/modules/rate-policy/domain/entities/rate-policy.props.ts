import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { RatePolicyScope } from '../enums/rate-policy-scope.enum';
import { RateItem } from '../value-objects/rate-item.vo';

export interface CreateRatePolicyProps {
  landlordId: Uuid;
  scope: RatePolicyScope;
  buildingId: Uuid | null;
  roomId: Uuid | null;
  rates: RateItem[];
}

export interface RatePolicyProps extends CreateRatePolicyProps {
  id: Uuid;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}
