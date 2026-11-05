import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { ReadingPeriod } from 'modules/meter-reading/domain/value-objects/reading-period.vo';
import { RateKind } from 'modules/rate-policy/domain/enums/rate-kind.enum';
import { RateType } from 'modules/rate-policy/domain/enums/rate-type.enum';
import { TierConfigInvalidException } from 'modules/rate-policy/domain/exceptions/tier-config-invalid.exception';
import {
  RateItem,
  RateItemProps,
} from 'modules/rate-policy/domain/value-objects/rate-item.vo';
import { InvoiceLine, InvoiceTierDetail } from '../entities/invoice.props';
import { InvoiceBlockReason } from '../enums/invoice-block-reason.enum';
import { InvoiceMoney } from '../value-objects/invoice-money.vo';
import { InvoiceDecimal } from '../value-objects/invoice-decimal.vo';
import { InvoiceServiceDate } from '../value-objects/invoice-service-date.vo';
import { InvoiceTieredCharge } from '../value-objects/invoice-tiered-charge.vo';
import { TotalNegativeException } from '../exceptions/total-negative.exception';
import {
  InvoiceCalculatorBlock,
  InvoiceCalculatorInput,
  InvoiceCalculatorResult,
  InvoiceServiceWindow,
} from './invoice-calculator.types';

export class InvoiceCalculatorService {
  calculate(input: InvoiceCalculatorInput): InvoiceCalculatorResult {
    const window = this.serviceWindow(input);
    if (!Number.isSafeInteger(input.headCount) || input.headCount < 0)
      throw new ValidationException('Invalid headCount');
    // EC2 takes precedence over rate configuration errors.
    if (!input.readings.electricity || !input.readings.water)
      return { reasonCode: InvoiceBlockReason.READING_MISSING };

    const rates = this.resolveRates(input);
    if ('reasonCode' in rates) return rates;
    const breakdown = this.calculateBreakdown(rates, input, window);
    if ('reasonCode' in breakdown) return breakdown;

    const rentAmount = InvoiceMoney.line(
      InvoiceMoney.parse(input.contract.rentPrice).mul(window.ratio),
    );
    try {
      InvoiceMoney.total([rentAmount, ...breakdown.map((line) => line.amount)]);
    } catch (error) {
      if (error instanceof TotalNegativeException)
        return { reasonCode: InvoiceBlockReason.TOTAL_NEGATIVE };
      throw error;
    }
    return { rentAmount, breakdown };
  }

  private serviceWindow(input: InvoiceCalculatorInput): InvoiceServiceWindow {
    const period = ReadingPeriod.create(input.period);
    const first = InvoiceServiceDate.create(`${period.value}-01`);
    const [year, month] = period.value.split('-').map(Number);
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const last = InvoiceServiceDate.create(
      `${period.value}-${String(daysInMonth).padStart(2, '0')}`,
    );
    const start = InvoiceServiceDate.create(input.contract.startDate);
    const end =
      input.contract.endDate === null
        ? last
        : InvoiceServiceDate.create(input.contract.endDate);
    const serviceStart = start.isAfter(first) ? start : first;
    const serviceEnd = last.isAfter(end) ? end : last;
    if (serviceStart.isAfter(serviceEnd))
      throw new ValidationException('Contract does not overlap invoice period');
    const activeDays = serviceStart.daysThrough(serviceEnd);
    const ratio = InvoiceDecimal.create(activeDays).div(daysInMonth);
    const ratioText = ratio.toFixed(6);
    return {
      serviceStart: serviceStart.value,
      serviceEnd: serviceEnd.value,
      ratio,
      ratioText,
    };
  }

  private resolveRates(
    input: InvoiceCalculatorInput,
  ): RateItemProps[] | InvoiceCalculatorBlock {
    const policy = input.roomPolicy?.isActive
      ? input.roomPolicy
      : input.buildingPolicy?.isActive
        ? input.buildingPolicy
        : null;
    if (!policy) return { reasonCode: InvoiceBlockReason.RATE_MISSING };
    const rates = policy.rates
      .map((rate) => (rate instanceof RateItem ? rate.toProps() : rate))
      .sort(
        (left, right) => this.priority(left.type) - this.priority(right.type),
      );
    if (
      ![RateType.ELECTRICITY, RateType.WATER].every((type) =>
        rates.some((rate) => rate.type === type),
      )
    )
      return { reasonCode: InvoiceBlockReason.RATE_MISSING };
    return rates;
  }

  private calculateBreakdown(
    rates: RateItemProps[],
    input: InvoiceCalculatorInput,
    window: InvoiceServiceWindow,
  ): InvoiceLine[] | InvoiceCalculatorBlock {
    const lines: InvoiceLine[] = [];
    for (const rate of rates) {
      const line = this.calculateLine(rate, input, window);
      if ('reasonCode' in line) return line;
      lines.push(line);
    }
    return lines;
  }

  private calculateLine(
    rate: RateItemProps,
    input: InvoiceCalculatorInput,
    window: InvoiceServiceWindow,
  ): InvoiceLine | InvoiceCalculatorBlock {
    const rateQuantity = this.quantityForRate(rate, input);
    if ('reasonCode' in rateQuantity) return rateQuantity;
    const { quantity, prorate } = rateQuantity;
    const priced = this.price(rate, quantity);
    if (priced === null)
      return { reasonCode: InvoiceBlockReason.TIER_CONFIG_INVALID };
    const amount = prorate ? priced.amount.mul(window.ratio) : priced.amount;
    return {
      type: rate.type,
      name: rate.name,
      rateKind: rate.rateKind,
      unitPrice: rate.unitPrice,
      quantity: quantity.toString(),
      unit: rate.billingUnit,
      serviceStart: window.serviceStart,
      serviceEnd: window.serviceEnd,
      prorateRatio: prorate ? window.ratioText : '1.000000',
      amount: InvoiceMoney.line(amount),
      ...(priced.tierDetail ? { tierDetail: priced.tierDetail } : {}),
    };
  }

  private quantityForRate(
    rate: RateItemProps,
    input: InvoiceCalculatorInput,
  ): { quantity: InvoiceDecimal; prorate: boolean } | InvoiceCalculatorBlock {
    if (rate.type === RateType.ELECTRICITY || rate.type === RateType.WATER) {
      if (rate.rateKind === RateKind.PER_HEAD) {
        if (input.headCount === 0)
          return { reasonCode: InvoiceBlockReason.HEADCOUNT_ZERO };
        return {
          quantity: InvoiceDecimal.create(input.headCount),
          prorate: false,
        };
      }
      return {
        quantity: InvoiceMoney.parse(input.readings[rate.type]!.consumption),
        prorate: false,
      };
    }
    switch (rate.rateKind) {
      case RateKind.FIXED_PER_PERIOD:
        return { quantity: InvoiceDecimal.create(1), prorate: true };
      case RateKind.PER_HEAD:
        if (input.headCount === 0)
          return { reasonCode: InvoiceBlockReason.HEADCOUNT_ZERO };
        return {
          quantity: InvoiceDecimal.create(input.headCount),
          prorate: true,
        };
      case RateKind.PER_AREA_M2:
        if (input.room.area === null)
          return { reasonCode: InvoiceBlockReason.AREA_MISSING };
        return { quantity: InvoiceMoney.parse(input.room.area), prorate: true };
      case RateKind.PER_VEHICLE:
        if (input.contract.vehicleCount === null)
          return { reasonCode: InvoiceBlockReason.VEHICLE_COUNT_MISSING };
        if (
          !Number.isSafeInteger(input.contract.vehicleCount) ||
          input.contract.vehicleCount < 0
        )
          throw new ValidationException('Invalid vehicleCount');
        return {
          quantity: InvoiceDecimal.create(input.contract.vehicleCount),
          prorate: true,
        };
      default:
        throw new ValidationException('Invalid recurring fee rate kind');
    }
  }

  private price(
    rate: RateItemProps,
    quantity: InvoiceDecimal,
  ): { amount: InvoiceDecimal; tierDetail?: InvoiceTierDetail[] } | null {
    if (rate.rateKind !== RateKind.TIERED)
      return { amount: quantity.mul(InvoiceMoney.parse(rate.unitPrice!)) };
    try {
      const charge = InvoiceTieredCharge.create(rate.steps, quantity);
      return { amount: charge.amount, tierDetail: charge.tierDetail };
    } catch (error) {
      if (error instanceof TierConfigInvalidException) return null;
      throw error;
    }
  }

  private priority(type: RateType): number {
    return type === RateType.ELECTRICITY ? 0 : type === RateType.WATER ? 1 : 2;
  }
}
