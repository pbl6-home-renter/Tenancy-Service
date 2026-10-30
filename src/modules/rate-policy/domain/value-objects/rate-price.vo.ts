import { ValidationException } from 'shared/domain/exceptions/validation.exception';

/** Non-negative decimal price with at most two fractional digits. */
export class RatePrice {
  static readonly PATTERN = /^(0|[1-9]\d*)(\.\d{1,2})?$/;

  private constructor(readonly value: string) {}

  static isValid(value: unknown): value is string {
    return typeof value === 'string' && RatePrice.PATTERN.test(value);
  }

  static create(value: unknown): RatePrice {
    if (!RatePrice.isValid(value)) {
      throw new ValidationException(
        'Rate price must be a non-negative decimal with at most two fractional digits',
      );
    }
    return new RatePrice(value);
  }

  equals(other: RatePrice): boolean {
    return this.value === other.value;
  }
}
