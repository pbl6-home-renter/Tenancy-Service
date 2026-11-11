import { RatePolicyEntity } from 'modules/rate-policy/domain/entities/rate-policy.entity';
import { RatePolicyScope } from 'modules/rate-policy/domain/enums/rate-policy-scope.enum';
import { RateKind } from 'modules/rate-policy/domain/enums/rate-kind.enum';
import { RateType } from 'modules/rate-policy/domain/enums/rate-type.enum';
import { BillingUnit } from 'modules/rate-policy/domain/enums/billing-unit.enum';
import { PolicyNotActiveException } from 'modules/rate-policy/domain/exceptions/policy-not-active.exception';
import { TierConfigInvalidException } from 'modules/rate-policy/domain/exceptions/tier-config-invalid.exception';
import { RateItem } from 'modules/rate-policy/domain/value-objects/rate-item.vo';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';

function electricityRate() {
  return RateItem.create({
    type: RateType.ELECTRICITY,
    name: 'Electricity',
    rateKind: RateKind.FLAT,
    unitPrice: '3500',
    steps: null,
    billingUnit: BillingUnit.KWH,
  });
}

describe('RatePolicyEntity', () => {
  it('replaces rates and records lifecycle events', () => {
    const policy = RatePolicyEntity.create({
      landlordId: generateUuid(),
      scope: RatePolicyScope.BUILDING,
      buildingId: generateUuid(),
      roomId: null,
      rates: [electricityRate()],
    });
    policy.replaceRates([
      electricityRate(),
      RateItem.create({
        type: RateType.WATER,
        name: 'Water',
        rateKind: RateKind.FLAT,
        unitPrice: '2000',
        steps: null,
        billingUnit: BillingUnit.M3,
      }),
    ]);
    policy.deactivate();
    policy.activate();

    expect(policy.isActive).toBe(true);
    expect(policy.rates).toHaveLength(2);
    expect(policy.pullDomainEvents().map((event) => event.eventType)).toEqual([
      'rate_policy.created',
      'rate_policy.updated',
      'rate_policy.deactivated',
      'rate_policy.updated',
    ]);
  });

  it('rejects duplicate rate types and repeated deactivation', () => {
    const rate = electricityRate();
    expect(() =>
      RatePolicyEntity.create({
        landlordId: generateUuid(),
        scope: RatePolicyScope.BUILDING,
        buildingId: generateUuid(),
        roomId: null,
        rates: [rate, electricityRate()],
      }),
    ).toThrow(ValidationException);

    const policy = RatePolicyEntity.create({
      landlordId: generateUuid(),
      scope: RatePolicyScope.BUILDING,
      buildingId: generateUuid(),
      roomId: null,
      rates: [electricityRate()],
    });
    policy.deactivate();
    expect(() => policy.deactivate()).toThrow(PolicyNotActiveException);
  });

  it('validates tier boundaries and billing unit against rate kind', () => {
    expect(() =>
      RateItem.create({
        type: RateType.ELECTRICITY,
        name: 'Invalid tier',
        rateKind: RateKind.TIERED,
        unitPrice: null,
        steps: [{ from: 1, to: null, price: '3500' }],
        billingUnit: BillingUnit.KWH,
      }),
    ).toThrow(TierConfigInvalidException);
    expect(() =>
      RateItem.create({
        type: RateType.WATER,
        name: 'Water',
        rateKind: RateKind.FLAT,
        unitPrice: '2000',
        steps: null,
        billingUnit: BillingUnit.KWH,
      }),
    ).toThrow(ValidationException);
  });
});
