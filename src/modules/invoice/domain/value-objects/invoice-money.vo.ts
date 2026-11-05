import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { TotalNegativeException } from '../exceptions/total-negative.exception';
import { InvoiceDecimal } from './invoice-decimal.vo';

export class InvoiceMoney {
  static parse(value: string, allowNegative = false): InvoiceDecimal {
    if (typeof value !== 'string' || !/^-?\d+(?:\.\d+)?$/.test(value)) {
      throw new ValidationException('Money must be a decimal string');
    }
    const amount = InvoiceDecimal.create(value);
    if (!allowNegative && amount.isNegative()) {
      throw new ValidationException('Invalid money amount');
    }
    return amount;
  }

  static line(value: string | InvoiceDecimal, allowNegative = false): string {
    const amount =
      typeof value === 'string' ? this.parse(value, allowNegative) : value;
    if (!allowNegative && amount.isNegative())
      throw new ValidationException('Invalid money amount');
    return amount.toFixed(4);
  }

  static total(values: string[]): string {
    const sum = values.reduce(
      (amount, value) => amount.plus(this.parse(value, true)),
      InvoiceDecimal.create(0),
    );
    if (sum.isNegative()) throw new TotalNegativeException();
    return sum.toFixed(0);
  }
}
