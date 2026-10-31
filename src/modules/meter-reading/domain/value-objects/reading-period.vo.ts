import { ValidationException } from 'shared/domain/exceptions/validation.exception';

export class ReadingPeriod {
  private constructor(readonly value: string) {}

  static create(value: string): ReadingPeriod {
    if (
      typeof value !== 'string' ||
      !/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(value)
    ) {
      throw new ValidationException('period must be YYYY-MM');
    }
    return new ReadingPeriod(value);
  }

  isAfter(other: ReadingPeriod): boolean {
    return this.value > other.value;
  }
}
