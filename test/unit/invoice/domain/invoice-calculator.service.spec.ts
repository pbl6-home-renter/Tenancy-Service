import { InvoiceBlockReason } from 'modules/invoice/domain/enums/invoice-block-reason.enum';
import { InvoiceCalculatorService } from 'modules/invoice/domain/services/invoice-calculator.service';
import { BillingUnit } from 'modules/rate-policy/domain/enums/billing-unit.enum';
import { RateKind } from 'modules/rate-policy/domain/enums/rate-kind.enum';
import { RateType } from 'modules/rate-policy/domain/enums/rate-type.enum';
import { RateItem } from 'modules/rate-policy/domain/value-objects/rate-item.vo';

function rate(type: RateType, unitPrice: string, billingUnit: BillingUnit) {
  return RateItem.create({
    type,
    name: type,
    rateKind: RateKind.FLAT,
    unitPrice,
    steps: null,
    billingUnit,
  });
}

function input() {
  return {
    period: '2026-11',
    contract: {
      startDate: '2026-11-01',
      endDate: null,
      rentPrice: '3000000',
      vehicleCount: 1,
    },
    room: { area: '25' },
    headCount: 2,
    roomPolicy: {
      isActive: true,
      rates: [
        rate(RateType.WATER, '500', BillingUnit.M3),
        rate(RateType.ELECTRICITY, '200', BillingUnit.KWH),
      ],
    },
    readings: {
      electricity: { consumption: '10' },
      water: { consumption: '2' },
    },
  };
}

describe('InvoiceCalculatorService', () => {
  it('orders utility lines consistently and calculates rent and consumption charges', () => {
    const result = new InvoiceCalculatorService().calculate(input());

    expect(result).toMatchObject({
      rentAmount: '3000000.0000',
      breakdown: [
        { type: RateType.ELECTRICITY, quantity: '10', amount: '2000.0000' },
        { type: RateType.WATER, quantity: '2', amount: '1000.0000' },
      ],
    });
  });

  it('returns the missing-reading blocker before rate configuration errors', () => {
    const result = new InvoiceCalculatorService().calculate({
      ...input(),
      roomPolicy: null,
      readings: { electricity: null, water: null },
    });

    expect(result).toEqual({ reasonCode: InvoiceBlockReason.READING_MISSING });
  });

  it('prorates rent over the active service days in the invoice period', () => {
    const result = new InvoiceCalculatorService().calculate({
      ...input(),
      period: '2024-02',
      contract: {
        ...input().contract,
        startDate: '2024-02-15',
      },
    });

    expect(result).toMatchObject({ rentAmount: '1551724.1379' });
  });
});
