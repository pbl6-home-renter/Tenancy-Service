import { ValidationException } from 'shared/domain/exceptions/validation.exception';

export class MeterValue {
  static readonly PATTERN = /^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$/;

  private constructor(
    readonly value: string,
    readonly cents: bigint,
  ) {}

  static create(value: string): MeterValue {
    if (typeof value !== 'string' || !this.PATTERN.test(value)) {
      throw new ValidationException(
        'reading must be a non-negative decimal with at most two fractional digits',
      );
    }
    const [whole, fraction = ''] = value.split('.');
    return new MeterValue(
      value,
      BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0') || '0'),
    );
  }

  static difference(current: MeterValue, previous: MeterValue): string {
    const cents = current.cents - previous.cents;
    if (cents < 0n)
      throw new ValidationException(
        'current reading is below previous reading',
      );
    const fraction = (cents % 100n)
      .toString()
      .padStart(2, '0')
      .replace(/0+$/, '');
    return `${cents / 100n}${fraction ? `.${fraction}` : ''}`;
  }
}
