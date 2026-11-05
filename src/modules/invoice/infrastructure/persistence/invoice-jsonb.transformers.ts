import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { ValueTransformer } from 'typeorm';
import { InvoiceBreakdown } from '../../domain/value-objects/invoice-breakdown.vo';
import { InvoiceOtherFees } from '../../domain/value-objects/invoice-other-fees.vo';

export const breakdownTransformer: ValueTransformer = {
  to: (breakdown: InvoiceBreakdown): Record<string, unknown>[] =>
    breakdown.value.map((line) => ({
      type: line.type,
      name: line.name,
      rate_kind: line.rateKind,
      unit_price: line.unitPrice,
      quantity: line.quantity,
      unit: line.unit,
      service_start: line.serviceStart,
      service_end: line.serviceEnd,
      prorate_ratio: line.prorateRatio,
      amount: line.amount,
      ...(line.tierDetail === undefined
        ? {}
        : { tier_detail: line.tierDetail }),
    })),
  from: (stored: unknown): InvoiceBreakdown => {
    if (!Array.isArray(stored))
      throw new ValidationException('Invalid stored invoice breakdown');
    return InvoiceBreakdown.create(
      stored.map((value: unknown) => {
        if (value === null || typeof value !== 'object' || Array.isArray(value))
          throw new ValidationException('Invalid stored invoice breakdown');
        const line = value as Record<string, unknown>;
        return {
          type: line.type,
          name: line.name,
          rateKind: line.rate_kind,
          unitPrice: line.unit_price,
          quantity: line.quantity,
          unit: line.unit,
          serviceStart: line.service_start,
          serviceEnd: line.service_end,
          prorateRatio: line.prorate_ratio,
          amount: line.amount,
          ...(line.tier_detail === undefined
            ? {}
            : { tierDetail: line.tier_detail }),
        };
      }),
    );
  },
};

export const otherFeesTransformer: ValueTransformer = {
  to: (fees: InvoiceOtherFees): Record<string, unknown>[] =>
    fees.value.map((fee) => ({ name: fee.name, amount: fee.amount })),
  from: (stored: unknown): InvoiceOtherFees => InvoiceOtherFees.create(stored),
};
