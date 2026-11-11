import { InvoiceEntity } from 'modules/invoice/domain/entities/invoice.entity';
import { InvoiceAlreadyIssuedException } from 'modules/invoice/domain/exceptions/invoice-already-issued.exception';
import { InvoiceStatus } from 'modules/invoice/domain/enums/invoice-status.enum';
import { InvoiceCode } from 'modules/invoice/domain/value-objects/invoice-code.vo';
import { InvoiceMoney } from 'modules/invoice/domain/value-objects/invoice-money.vo';
import { InvoiceDecimal } from 'modules/invoice/domain/value-objects/invoice-decimal.vo';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { TotalNegativeException } from 'modules/invoice/domain/exceptions/total-negative.exception';
import { ReadingPeriod } from 'modules/meter-reading/domain/value-objects/reading-period.vo';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';

describe('InvoiceDecimal and InvoiceMoney', () => {
  it('uses exact rational arithmetic and rounds only when formatted', () => {
    const total = InvoiceDecimal.create('0.1').plus(
      InvoiceDecimal.create('0.2'),
    );

    expect(total.toString()).toBe('0.3');
    expect(InvoiceMoney.total(['10.4', '0.1'])).toBe('11');
    expect(InvoiceMoney.line('1.23456')).toBe('1.2346');
  });

  it('rejects negative totals and malformed money values', () => {
    expect(() => InvoiceMoney.total(['-2', '1'])).toThrow(
      TotalNegativeException,
    );
    expect(() => InvoiceMoney.parse('1.2.3')).toThrow(ValidationException);
  });
});

describe('InvoiceCode', () => {
  it('generates a code tied to its reading period', () => {
    expect(InvoiceCode.generate(ReadingPeriod.create('2026-11')).value).toMatch(
      /^INV-202611-[A-Z0-9]{4}$/,
    );
  });

  it('rejects codes outside the published format', () => {
    expect(() => InvoiceCode.create('INV-2026-ABCD')).toThrow(
      ValidationException,
    );
  });
});

describe('InvoiceEntity', () => {
  it('keeps totals consistent when updating fees and issues once', () => {
    const invoice = InvoiceEntity.create({
      contractId: generateUuid(),
      period: '2026-11',
      code: 'INV-202611-A1B2',
      calculation: { rentAmount: '3000000', breakdown: [] },
    });

    invoice.updateExtras(
      [{ name: 'Cleaning', amount: '50000' }],
      'Monthly fee',
    );
    expect(invoice.totalAmount).toBe('3050000');
    invoice.issue(new Date('2026-11-30T00:00:00.000Z'));
    expect(invoice.status).toBe(InvoiceStatus.ISSUED);
    expect(invoice.pullDomainEvents().map((event) => event.eventType)).toEqual([
      'invoice.generated',
      'invoice.updated',
      'invoice.issued',
    ]);
    expect(() => invoice.updateExtras([], null)).toThrow(
      InvoiceAlreadyIssuedException,
    );
  });

  it('rejects reconstitution when its persisted total disagrees with its line items', () => {
    expect(() =>
      InvoiceEntity.reconstitute({
        id: generateUuid(),
        contractId: generateUuid(),
        code: 'INV-202611-A1B2',
        period: '2026-11',
        rentAmount: '100',
        breakdown: [],
        otherFees: [],
        totalAmount: '99',
        status: InvoiceStatus.PENDING,
        issuedAt: null,
        voidedInvoiceId: null,
        voidReason: null,
        note: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
      }),
    ).toThrow(ValidationException);
  });
});
