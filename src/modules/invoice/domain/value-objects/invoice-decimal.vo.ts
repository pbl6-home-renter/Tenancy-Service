import { ValidationException } from 'shared/domain/exceptions/validation.exception';

/** Exact rational arithmetic for invoice amounts and quantities. */
export class InvoiceDecimal {
  private constructor(
    private readonly numerator: bigint,
    private readonly denominator: bigint,
  ) {}

  static create(value: string | number): InvoiceDecimal {
    const text = String(value);
    if (
      (typeof value === 'number' && !Number.isSafeInteger(value)) ||
      !/^-?\d+(?:\.\d+)?$/.test(text)
    )
      throw new ValidationException(
        'Value must be a decimal string or safe integer',
      );
    const negative = text.startsWith('-');
    const digits = negative ? text.slice(1) : text;
    const [whole, fraction = ''] = digits.split('.');
    const denominator = 10n ** BigInt(fraction.length);
    const numerator = BigInt(whole + fraction) * (negative ? -1n : 1n);
    return new InvoiceDecimal(numerator, denominator);
  }

  static min(left: InvoiceDecimal, right: InvoiceDecimal): InvoiceDecimal {
    return left.lte(right) ? left : right;
  }

  plus(other: InvoiceDecimal): InvoiceDecimal {
    return new InvoiceDecimal(
      this.numerator * other.denominator + other.numerator * this.denominator,
      this.denominator * other.denominator,
    );
  }

  minus(other: InvoiceDecimal): InvoiceDecimal {
    return new InvoiceDecimal(
      this.numerator * other.denominator - other.numerator * this.denominator,
      this.denominator * other.denominator,
    );
  }

  mul(other: InvoiceDecimal): InvoiceDecimal {
    return new InvoiceDecimal(
      this.numerator * other.numerator,
      this.denominator * other.denominator,
    );
  }

  div(other: InvoiceDecimal | number): InvoiceDecimal {
    const divisor =
      typeof other === 'number' ? InvoiceDecimal.create(other) : other;
    if (divisor.numerator === 0n)
      throw new ValidationException('Cannot divide by zero');
    const sign = divisor.numerator < 0n ? -1n : 1n;
    return new InvoiceDecimal(
      this.numerator * divisor.denominator * sign,
      this.denominator * divisor.numerator * sign,
    );
  }

  lte(other: InvoiceDecimal | number): boolean {
    const right =
      typeof other === 'number' ? InvoiceDecimal.create(other) : other;
    return (
      this.numerator * right.denominator <= right.numerator * this.denominator
    );
  }

  gt(other: InvoiceDecimal | number): boolean {
    const right =
      typeof other === 'number' ? InvoiceDecimal.create(other) : other;
    return (
      this.numerator * right.denominator > right.numerator * this.denominator
    );
  }

  isNegative(): boolean {
    return this.numerator < 0n;
  }

  eq(other: InvoiceDecimal): boolean {
    return (
      this.numerator * other.denominator === other.numerator * this.denominator
    );
  }

  toFixed(places: number): string {
    if (!Number.isSafeInteger(places) || places < 0)
      throw new ValidationException('Invalid decimal places');
    const scale = 10n ** BigInt(places);
    const absolute = this.numerator < 0n ? -this.numerator : this.numerator;
    const rounded =
      (absolute * scale * 2n + this.denominator) / (this.denominator * 2n);
    const sign = this.numerator < 0n && rounded !== 0n ? '-' : '';
    if (places === 0) return sign + rounded.toString();
    const whole = rounded / scale;
    const fraction = (rounded % scale).toString().padStart(places, '0');
    return `${sign}${whole}.${fraction}`;
  }

  toString(): string {
    let denominator = this.denominator;
    let twos = 0;
    let fives = 0;
    while (denominator % 2n === 0n) {
      denominator /= 2n;
      twos++;
    }
    while (denominator % 5n === 0n) {
      denominator /= 5n;
      fives++;
    }
    const text = this.toFixed(denominator === 1n ? Math.max(twos, fives) : 20);
    return text.includes('.')
      ? text.replace(/0+$/, '').replace(/\.$/, '')
      : text;
  }
}
