import { ValidationException } from 'shared/domain/exceptions/validation.exception';

export class Latitude {
  private constructor(private readonly _value: number) {}

  static create(value: number): Latitude {
    if (!Number.isFinite(value) || value < -90 || value > 90) {
      throw new ValidationException('latitude must be between -90 and 90');
    }

    return new Latitude(value);
  }

  get value(): number {
    return this._value;
  }

  equals(other: Latitude): boolean {
    return this._value === other._value;
  }
}
