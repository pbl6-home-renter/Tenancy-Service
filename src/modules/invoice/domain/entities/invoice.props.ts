import { RateKind } from 'modules/rate-policy/domain/enums/rate-kind.enum';
import { RateType } from 'modules/rate-policy/domain/enums/rate-type.enum';
import { BillingUnit } from 'modules/rate-policy/domain/enums/billing-unit.enum';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { InvoiceStatus } from '../enums/invoice-status.enum';

export interface InvoiceTierDetail {
  step: number;
  from: number;
  to: number | null;
  price: string;
  quantity: string;
  amount: string;
}

export interface InvoiceLine {
  type: RateType;
  name: string;
  rateKind: RateKind;
  unitPrice: string | null;
  quantity: string;
  unit: BillingUnit;
  serviceStart: string;
  serviceEnd: string;
  prorateRatio: string;
  amount: string;
  tierDetail?: InvoiceTierDetail[];
}

export interface InvoiceOtherFee {
  name: string;
  amount: string;
}

export interface InvoiceCalculation {
  rentAmount: string;
  breakdown: InvoiceLine[];
}

export interface InvoiceProps extends InvoiceCalculation {
  id: Uuid;
  contractId: Uuid;
  code: string;
  period: string;
  otherFees: InvoiceOtherFee[];
  totalAmount: string;
  status: InvoiceStatus;
  issuedAt: Date | null;
  voidedInvoiceId: Uuid | null;
  voidReason: string | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}
