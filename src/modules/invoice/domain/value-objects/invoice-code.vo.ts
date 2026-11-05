import { randomBytes } from 'node:crypto';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { ReadingPeriod } from 'modules/meter-reading/domain/value-objects/reading-period.vo';

export class InvoiceCode {
  static readonly PATTERN = /^INV-\d{6}-[A-Z0-9]{4}$/;

  private constructor(readonly value: string) {}

  static create(value: string): InvoiceCode {
    if (!this.PATTERN.test(value))
      throw new ValidationException('Invalid invoice code');
    return new InvoiceCode(value);
  }

  static generate(period: ReadingPeriod): InvoiceCode {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const suffix = [...randomBytes(4)]
      .map((byte) => alphabet[byte % alphabet.length])
      .join('');
    return this.create(`INV-${period.value.replace('-', '')}-${suffix}`);
  }
}
