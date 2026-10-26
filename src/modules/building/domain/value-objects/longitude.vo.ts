import { ValidationException } from 'shared/domain/exceptions/validation.exception';

export class Longitude {
  private constructor(private readonly _value: number) {}

  static create(value: number): Longitude {
    if (!Number.isFinite(value) || value < -180 || value > 180) {
      throw new ValidationException('longitude must be between -180 and 180');
    }

    return new Longitude(value);
  }

  get value(): number {
    return this._value;
  }

  equals(other: Longitude): boolean {
    return this._value === other._value;
  }
}
