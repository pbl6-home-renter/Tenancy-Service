import { ValidationException } from 'shared/domain/exceptions/validation.exception';

export class TenantPhone {
  static readonly PATTERN = /^(0[0-9]{9}|\+84[0-9]{9})$/;

  private constructor(private readonly _value: string) {}

  static create(value: string): TenantPhone {
    if (typeof value !== 'string' || !TenantPhone.PATTERN.test(value)) {
      throw new ValidationException(
        'tenantPhone must be a valid Vietnamese phone number',
      );
    }

    return new TenantPhone(value);
  }

  get value(): string {
    return this._value;
  }

  equals(other: TenantPhone): boolean {
    return this._value === other._value;
  }
}
