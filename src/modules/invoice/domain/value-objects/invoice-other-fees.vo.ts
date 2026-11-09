import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { InvoiceOtherFee } from '../entities/invoice.props';
import { InvoiceMoney } from './invoice-money.vo';

export class InvoiceOtherFees {
  private constructor(private readonly fees: InvoiceOtherFee[]) {}

  static create(value: unknown): InvoiceOtherFees {
    if (!Array.isArray(value))
      throw new ValidationException('Invoice otherFees must be an array');
    if (value.length > 20)
      throw new ValidationException(
        'Invoice otherFees must contain at most 20 items',
      );
    return new InvoiceOtherFees(
      value.map((item) => {
        if (item === null || typeof item !== 'object' || Array.isArray(item))
          throw new ValidationException('Invalid invoice fee');
        const fee = item as Record<string, unknown>;
        if (
          typeof fee.name !== 'string' ||
          fee.name.trim().length < 1 ||
          fee.name.trim().length > 100 ||
          typeof fee.amount !== 'string'
        )
          throw new ValidationException('Invalid invoice fee');
        return {
          name: fee.name.trim(),
          amount: InvoiceMoney.line(fee.amount, true),
        };
      }),
    );
  }

  get value(): InvoiceOtherFee[] {
    return this.fees.map((fee) => ({ ...fee }));
  }

  equals(other: InvoiceOtherFees): boolean {
    return JSON.stringify(this.fees) === JSON.stringify(other.fees);
  }
}
