import { BillingUnit } from 'modules/rate-policy/domain/enums/billing-unit.enum';
import { RateKind } from 'modules/rate-policy/domain/enums/rate-kind.enum';
import { RateType } from 'modules/rate-policy/domain/enums/rate-type.enum';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { InvoiceLine, InvoiceTierDetail } from '../entities/invoice.props';
import { InvoiceMoney } from './invoice-money.vo';
import { InvoiceServiceDate } from './invoice-service-date.vo';

export class InvoiceBreakdown {
  private constructor(private readonly lines: InvoiceLine[]) {}

  static create(value: unknown): InvoiceBreakdown {
    if (!Array.isArray(value))
      throw new ValidationException('Invoice breakdown must be an array');
    return new InvoiceBreakdown(value.map((line) => this.createLine(line)));
  }

  get value(): InvoiceLine[] {
    return structuredClone(this.lines);
  }

  equals(other: InvoiceBreakdown): boolean {
    return JSON.stringify(this.lines) === JSON.stringify(other.lines);
  }

  private static createLine(value: unknown): InvoiceLine {
    const line = this.record(value);
    if (
      !Object.values(RateType).includes(line.type as RateType) ||
      typeof line.name !== 'string' ||
      !Object.values(RateKind).includes(line.rateKind as RateKind) ||
      (line.unitPrice !== null && typeof line.unitPrice !== 'string') ||
      typeof line.quantity !== 'string' ||
      !Object.values(BillingUnit).includes(line.unit as BillingUnit) ||
      typeof line.serviceStart !== 'string' ||
      typeof line.serviceEnd !== 'string' ||
      typeof line.prorateRatio !== 'string' ||
      typeof line.amount !== 'string'
    )
      throw new ValidationException('Invalid invoice breakdown line');
    InvoiceServiceDate.create(line.serviceStart);
    InvoiceServiceDate.create(line.serviceEnd);
    InvoiceMoney.parse(line.quantity);
    InvoiceMoney.parse(line.prorateRatio);
    if (line.unitPrice !== null) InvoiceMoney.parse(line.unitPrice);

    const tierDetail =
      line.tierDetail === undefined
        ? undefined
        : this.createTierDetails(line.tierDetail);
    return {
      type: line.type as RateType,
      name: line.name,
      rateKind: line.rateKind as RateKind,
      unitPrice: line.unitPrice,
      quantity: line.quantity,
      unit: line.unit as BillingUnit,
      serviceStart: line.serviceStart,
      serviceEnd: line.serviceEnd,
      prorateRatio: line.prorateRatio,
      amount: InvoiceMoney.line(line.amount),
      ...(tierDetail === undefined ? {} : { tierDetail }),
    };
  }

  private static createTierDetails(value: unknown): InvoiceTierDetail[] {
    if (!Array.isArray(value))
      throw new ValidationException('Invalid invoice tier details');
    return value.map((item) => {
      const tier = this.record(item);
      if (
        !Number.isSafeInteger(tier.step) ||
        !Number.isSafeInteger(tier.from) ||
        (tier.to !== null && !Number.isSafeInteger(tier.to)) ||
        typeof tier.price !== 'string' ||
        typeof tier.quantity !== 'string' ||
        typeof tier.amount !== 'string'
      )
        throw new ValidationException('Invalid invoice tier detail');
      InvoiceMoney.parse(tier.price);
      InvoiceMoney.parse(tier.quantity);
      return {
        step: tier.step as number,
        from: tier.from as number,
        to: tier.to as number | null,
        price: tier.price,
        quantity: tier.quantity,
        amount: InvoiceMoney.line(tier.amount),
      };
    });
  }

  private static record(value: unknown): Record<string, unknown> {
    if (value === null || typeof value !== 'object' || Array.isArray(value))
      throw new ValidationException('Invalid invoice breakdown');
    return value as Record<string, unknown>;
  }
}
