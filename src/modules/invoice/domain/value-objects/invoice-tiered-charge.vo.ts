import { TierConfigInvalidException } from 'modules/rate-policy/domain/exceptions/tier-config-invalid.exception';
import { RateStep } from 'modules/rate-policy/domain/value-objects/rate-item.vo';
import { RatePrice } from 'modules/rate-policy/domain/value-objects/rate-price.vo';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { InvoiceTierDetail } from '../entities/invoice.props';
import { InvoiceMoney } from './invoice-money.vo';
import { InvoiceDecimal } from './invoice-decimal.vo';

export class InvoiceTieredCharge {
  private constructor(
    readonly amount: InvoiceDecimal,
    private readonly details: InvoiceTierDetail[],
  ) {}

  static create(
    steps: RateStep[] | null,
    quantity: InvoiceDecimal,
  ): InvoiceTieredCharge {
    if (quantity.isNegative()) {
      throw new ValidationException('Invalid consumption');
    }
    if (!steps?.length || steps[0].from !== 0 || steps.at(-1)?.to !== null) {
      throw new TierConfigInvalidException();
    }
    let previousTo: number | null = null;
    for (const [index, step] of steps.entries()) {
      if (
        !Number.isSafeInteger(step.from) ||
        step.from !== (index === 0 ? 0 : previousTo! + 1) ||
        (step.to !== null &&
          (!Number.isSafeInteger(step.to) || step.to < step.from)) ||
        (step.to === null) !== (index === steps.length - 1) ||
        !RatePrice.isValid(step.price)
      )
        throw new TierConfigInvalidException();
      previousTo = step.to;
    }

    let remaining = quantity;
    let amount = InvoiceDecimal.create(0);
    const details: InvoiceTierDetail[] = [];
    for (const [index, step] of steps.entries()) {
      // The first 0–50 tier covers 50 units; 51–100 covers another 50.
      const capacity =
        step.to === null
          ? remaining
          : InvoiceDecimal.create(step.to - step.from + (index === 0 ? 0 : 1));
      const consumed = InvoiceDecimal.min(remaining, capacity);
      if (consumed.lte(0)) break;
      const tierAmount = consumed.mul(InvoiceMoney.parse(step.price));
      amount = amount.plus(tierAmount);
      details.push({
        step: index + 1,
        from: step.from,
        to: step.to,
        price: step.price,
        quantity: consumed.toString(),
        amount: InvoiceMoney.line(tierAmount),
      });
      remaining = remaining.minus(consumed);
    }
    if (remaining.gt(0)) throw new TierConfigInvalidException();
    return new InvoiceTieredCharge(amount, details);
  }

  get tierDetail(): InvoiceTierDetail[] {
    return this.details.map((detail) => ({ ...detail }));
  }

  equals(other: InvoiceTieredCharge): boolean {
    return (
      this.amount.eq(other.amount) &&
      JSON.stringify(this.details) === JSON.stringify(other.details)
    );
  }
}
