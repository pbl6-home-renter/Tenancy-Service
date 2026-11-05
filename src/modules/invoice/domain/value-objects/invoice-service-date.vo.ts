import { ValidationException } from 'shared/domain/exceptions/validation.exception';

export class InvoiceServiceDate {
  static readonly PATTERN = /^\d{4}-\d{2}-\d{2}$/;

  private constructor(readonly value: string) {}

  static create(value: string): InvoiceServiceDate {
    if (typeof value !== 'string' || !this.PATTERN.test(value)) {
      throw new ValidationException('Invalid invoice service date');
    }
    const date = new Date(`${value}T00:00:00Z`);
    if (
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value
    ) {
      throw new ValidationException('Invalid invoice service date');
    }
    return new InvoiceServiceDate(value);
  }

  isAfter(other: InvoiceServiceDate): boolean {
    return this.value > other.value;
  }

  daysThrough(other: InvoiceServiceDate): number {
    if (this.isAfter(other))
      throw new ValidationException('Invalid service date range');
    const start = Date.parse(`${this.value}T00:00:00Z`);
    const end = Date.parse(`${other.value}T00:00:00Z`);
    return (end - start) / 86400000 + 1;
  }

  equals(other: InvoiceServiceDate): boolean {
    return this.value === other.value;
  }
}
