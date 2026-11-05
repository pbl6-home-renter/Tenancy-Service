import { InvoiceEntity } from '../../../domain/entities/invoice.entity';
import { InvoiceBreakdown } from '../../../domain/value-objects/invoice-breakdown.vo';
import { InvoiceOtherFees } from '../../../domain/value-objects/invoice-other-fees.vo';
import { InvoiceTypeormEntity } from '../invoice.typeorm-entity';

export class InvoiceMapper {
  static toDomain(raw: InvoiceTypeormEntity): InvoiceEntity {
    return InvoiceEntity.reconstitute({
      id: raw.id,
      contractId: raw.contractId,
      code: raw.code,
      period: raw.period.value,
      rentAmount: raw.rentAmount,
      breakdown: raw.breakdown.value,
      otherFees: raw.otherFees.value,
      totalAmount: raw.totalAmount,
      status: raw.status,
      issuedAt: raw.issuedAt,
      voidedInvoiceId: raw.voidedInvoiceId,
      voidReason: raw.voidReason,
      note: raw.note,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      isDeleted: raw.isDeleted,
    });
  }

  static toPersistence(invoice: InvoiceEntity): InvoiceTypeormEntity {
    const raw = new InvoiceTypeormEntity();
    raw.id = invoice.id;
    raw.contractId = invoice.contractId;
    raw.code = invoice.code.value;
    raw.period = invoice.period;
    raw.rentAmount = invoice.rentAmount;
    raw.breakdown = InvoiceBreakdown.create(invoice.breakdown);
    raw.otherFees = InvoiceOtherFees.create(invoice.otherFees);
    raw.totalAmount = invoice.totalAmount;
    raw.status = invoice.status;
    raw.issuedAt = invoice.issuedAt;
    raw.voidedInvoiceId = invoice.voidedInvoiceId;
    raw.voidReason = invoice.voidReason;
    raw.note = invoice.note;
    raw.createdAt = invoice.createdAt;
    raw.updatedAt = invoice.updatedAt;
    raw.isDeleted = invoice.isDeleted;
    return raw;
  }
}
