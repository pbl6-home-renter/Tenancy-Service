import { ValidationException } from 'shared/domain/exceptions/validation.exception';

/** Proposed room-listing deposit, distinct from the amount agreed in a Contract. */
export class DepositAmount {
  private static readonly MAX_VALUE = 999_999_999_999;

  private constructor(private readonly _value: number) {}

  static create(value: number): DepositAmount {
    if (
      !Number.isSafeInteger(value) ||
      value < 0 ||
      value > DepositAmount.MAX_VALUE
    ) {
      throw new ValidationException(
        `depositAmount must be an integer between 0 and ${DepositAmount.MAX_VALUE}`,
      );
    }

    return new DepositAmount(value);
  }

  get value(): number {
    return this._value;
  }

  equals(other: DepositAmount): boolean {
    return this._value === other._value;
  }
}
