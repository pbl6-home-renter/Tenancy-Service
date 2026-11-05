import { InvoiceDecimal } from '../value-objects/invoice-decimal.vo';
import {
  RateItem,
  RateItemProps,
} from 'modules/rate-policy/domain/value-objects/rate-item.vo';
import { InvoiceCalculation } from '../entities/invoice.props';
import { InvoiceBlockReason } from '../enums/invoice-block-reason.enum';

interface InvoiceCalculatorPolicy {
  isActive: boolean;
  rates: readonly (RateItem | RateItemProps)[];
}

export interface InvoiceCalculatorInput {
  period: string;
  contract: {
    startDate: string;
    endDate: string | null;
    rentPrice: string;
    vehicleCount: number | null;
  };
  room: { area: string | null };
  headCount: number;
  roomPolicy?: InvoiceCalculatorPolicy | null;
  buildingPolicy?: InvoiceCalculatorPolicy | null;
  readings: {
    electricity?: { consumption: string } | null;
    water?: { consumption: string } | null;
  };
}

export interface InvoiceCalculatorBlock {
  reasonCode: InvoiceBlockReason;
}

export interface InvoiceServiceWindow {
  serviceStart: string;
  serviceEnd: string;
  ratio: InvoiceDecimal;
  ratioText: string;
}

export type InvoiceCalculatorResult =
  InvoiceCalculation | InvoiceCalculatorBlock;
