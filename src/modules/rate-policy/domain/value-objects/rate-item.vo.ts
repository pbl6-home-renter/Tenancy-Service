import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { BillingUnit } from '../enums/billing-unit.enum';
import { RateKind } from '../enums/rate-kind.enum';
import { RateType } from '../enums/rate-type.enum';
import { InvalidRateKindException } from '../exceptions/invalid-rate-kind.exception';
import { TierConfigInvalidException } from '../exceptions/tier-config-invalid.exception';
import { RatePrice } from './rate-price.vo';

export interface RateStep {
  from: number;
  to: number | null;
  price: string;
}

export interface RateItemProps {
  type: RateType;
  name: string;
  rateKind: RateKind;
  unitPrice: string | null;
  steps: RateStep[] | null;
  billingUnit: BillingUnit;
}

type StoredRateItemProps = Omit<RateItemProps, 'unitPrice' | 'steps'> & {
  unitPrice: RatePrice | null;
  steps: { from: number; to: number | null; price: RatePrice }[] | null;
};
const FEE_KINDS = [
  RateKind.FIXED_PER_PERIOD,
  RateKind.PER_HEAD,
  RateKind.PER_AREA_M2,
  RateKind.PER_VEHICLE,
];

export class RateItem {
  private constructor(private readonly props: StoredRateItemProps) {}

  static create(input: RateItemProps): RateItem {
    if (!Object.values(RateType).includes(input.type)) {
      throw new ValidationException('Invalid rate type');
    }
    if (!Object.values(RateKind).includes(input.rateKind)) {
      throw new InvalidRateKindException();
    }
    if (typeof input.name !== 'string') {
      throw new ValidationException('Rate name must contain 1–100 characters');
    }
    const name = input.name.trim();
    if ([...name].length < 1 || [...name].length > 100) {
      throw new ValidationException('Rate name must contain 1–100 characters');
    }

    const allowedKinds =
      input.type === RateType.ELECTRICITY
        ? [RateKind.FLAT, RateKind.TIERED]
        : input.type === RateType.WATER
          ? [RateKind.FLAT, RateKind.TIERED, RateKind.PER_HEAD]
          : FEE_KINDS;
    if (!allowedKinds.includes(input.rateKind)) {
      throw new InvalidRateKindException();
    }

    const expectedUnit =
      input.rateKind === RateKind.PER_HEAD
        ? BillingUnit.PERSON
        : input.rateKind === RateKind.PER_AREA_M2
          ? BillingUnit.M2
          : input.rateKind === RateKind.PER_VEHICLE
            ? BillingUnit.VEHICLE
            : input.rateKind === RateKind.FIXED_PER_PERIOD
              ? BillingUnit.ROOM
              : input.type === RateType.ELECTRICITY
                ? BillingUnit.KWH
                : BillingUnit.M3;
    if (input.billingUnit !== expectedUnit) {
      throw new ValidationException(`billingUnit must be ${expectedUnit}`);
    }

    if (input.rateKind === RateKind.TIERED) {
      if (
        input.unitPrice !== null ||
        !Array.isArray(input.steps) ||
        !input.steps.length
      ) {
        throw new TierConfigInvalidException(
          'Tiered rate requires steps and null unitPrice',
        );
      }
      let previousTo: number | null = null;
      input.steps.forEach((step, index) => {
        const expectedFrom = index === 0 ? 0 : previousTo! + 1;
        if (
          !step ||
          !Number.isSafeInteger(step.from) ||
          step.from !== expectedFrom ||
          (step.to !== null &&
            (!Number.isSafeInteger(step.to) || step.to < step.from)) ||
          (step.to === null) !== (index === input.steps!.length - 1) ||
          !RatePrice.isValid(step.price)
        ) {
          throw new TierConfigInvalidException();
        }
        previousTo = step.to;
      });
    } else if (!RatePrice.isValid(input.unitPrice) || input.steps != null) {
      throw new ValidationException(
        'Non-tiered rate requires unitPrice and no steps',
      );
    }

    // TODO(seed-presets): D31/D32 presets are supplied by a later seed task.
    return new RateItem({
      type: input.type,
      name,
      rateKind: input.rateKind,
      unitPrice:
        input.unitPrice === null ? null : RatePrice.create(input.unitPrice),
      steps:
        input.steps?.map((step) => ({
          from: step.from,
          to: step.to,
          price: RatePrice.create(step.price),
        })) ?? null,
      billingUnit: input.billingUnit,
    });
  }

  static reconstitute(props: RateItemProps): RateItem {
    return RateItem.create(props);
  }

  get type(): RateType {
    return this.props.type;
  }

  toProps(): RateItemProps {
    return {
      ...this.props,
      unitPrice: this.props.unitPrice?.value ?? null,
      steps:
        this.props.steps?.map((step) => ({
          from: step.from,
          to: step.to,
          price: step.price.value,
        })) ?? null,
    };
  }
}
