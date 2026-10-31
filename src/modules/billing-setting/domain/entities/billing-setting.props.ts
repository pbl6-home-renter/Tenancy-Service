import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { BillingSettingScope } from '../enums/billing-setting-scope.enum';

export interface BillingSettingCreateProps {
  landlordId: Uuid;
  scope: BillingSettingScope;
  buildingId: Uuid;
  roomId: Uuid | null;
  paymentDueDay?: number;
  remindDay?: number | null;
  botEnabled?: boolean;
}

export interface BillingSettingProps extends Omit<
  BillingSettingCreateProps,
  'paymentDueDay' | 'remindDay' | 'botEnabled'
> {
  id: Uuid;
  paymentDueDay: number;
  remindDay: number | null;
  botEnabled: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

export interface BillingSettingUpdateProps {
  paymentDueDay?: number;
  remindDay?: number | null;
  botEnabled?: boolean;
  isActive?: boolean;
}
