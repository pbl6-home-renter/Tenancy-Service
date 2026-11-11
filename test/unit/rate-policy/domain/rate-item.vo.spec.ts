import { BillingUnit } from 'modules/rate-policy/domain/enums/billing-unit.enum';
import { RateKind } from 'modules/rate-policy/domain/enums/rate-kind.enum';
import { RateType } from 'modules/rate-policy/domain/enums/rate-type.enum';
import { RateItem } from 'modules/rate-policy/domain/value-objects/rate-item.vo';
import { RatePrice } from 'modules/rate-policy/domain/value-objects/rate-price.vo';
import { TierConfigInvalidException } from 'modules/rate-policy/domain/exceptions/tier-config-invalid.exception';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';

describe('RatePrice', () => {
  it('preserves valid decimal notation and rejects excess precision or leading zeroes', () => {
    expect(RatePrice.create('0.50').value).toBe('0.50');
    expect(() => RatePrice.create('01.00')).toThrow(ValidationException);
    expect(() => RatePrice.create('1.234')).toThrow(ValidationException);
  });
});

describe('RateItem', () => {
  it('trims names and preserves a contiguous tier schedule', () => {
    const item = RateItem.create({
      type: RateType.ELECTRICITY,
      name: ' Electricity ',
      rateKind: RateKind.TIERED,
      unitPrice: null,
      steps: [
        { from: 0, to: 100, price: '2.50' },
        { from: 101, to: null, price: '3.25' },
      ],
      billingUnit: BillingUnit.KWH,
    });

    expect(item.toProps()).toEqual({
      type: RateType.ELECTRICITY,
      name: 'Electricity',
      rateKind: RateKind.TIERED,
      unitPrice: null,
      steps: [
        { from: 0, to: 100, price: '2.50' },
        { from: 101, to: null, price: '3.25' },
      ],
      billingUnit: BillingUnit.KWH,
    });
  });

  it('rejects incompatible billing units and gaps in tier boundaries', () => {
    expect(() =>
      RateItem.create({
        type: RateType.WATER,
        name: 'Water',
        rateKind: RateKind.FLAT,
        unitPrice: '10',
        steps: null,
        billingUnit: BillingUnit.KWH,
      }),
    ).toThrow(ValidationException);
    expect(() =>
      RateItem.create({
        type: RateType.ELECTRICITY,
        name: 'Electricity',
        rateKind: RateKind.TIERED,
        unitPrice: null,
        steps: [
          { from: 0, to: 100, price: '2.50' },
          { from: 102, to: null, price: '3.25' },
        ],
        billingUnit: BillingUnit.KWH,
      }),
    ).toThrow(TierConfigInvalidException);
  });
});
