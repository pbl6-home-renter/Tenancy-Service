import {
  Check,
  Column,
  Entity,
  ForeignKey,
  Index,
  ValueTransformer,
} from 'typeorm';
import { ContractTypeormEntity } from 'modules/contract/infrastructure/persistence/contract.entity';
import { ReadingPeriod } from 'modules/meter-reading/domain/value-objects/reading-period.vo';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { AbstractEntity } from 'shared/infrastructure/database/abstract.typeorm-entity';
import { InvoiceStatus } from '../../domain/enums/invoice-status.enum';
import { InvoiceBreakdown } from '../../domain/value-objects/invoice-breakdown.vo';
import { InvoiceOtherFees } from '../../domain/value-objects/invoice-other-fees.vo';
import {
  breakdownTransformer,
  otherFeesTransformer,
} from './invoice-jsonb.transformers';

const periodTransformer: ValueTransformer = {
  to: (period: ReadingPeriod): string => period.value,
  from: (value: string): ReadingPeriod => ReadingPeriod.create(value),
};

@Entity('invoices')
@Index('UQ_invoices_code', ['code'], { unique: true })
@Index('UQ_invoices_contract_period', ['contractId', 'period'], {
  unique: true,
  where: "status IN ('pending', 'issued') AND is_deleted = false",
})
@Check('CHK_invoices_period', "period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'")
@Check('CHK_invoices_code', "code ~ '^INV-[0-9]{6}-[A-Z0-9]{4}$'")
@Check('CHK_invoices_rent_amount', 'rent_amount >= 0')
@Check(
  'CHK_invoices_total_amount',
  'total_amount >= 0 AND total_amount = round(total_amount)',
)
@Check('CHK_invoices_breakdown_array', "jsonb_typeof(breakdown) = 'array'")
@Check('CHK_invoices_other_fees_array', "jsonb_typeof(other_fees) = 'array'")
@Check(
  'CHK_invoices_issued_at',
  "(status = 'pending' AND issued_at IS NULL) OR (status = 'issued' AND issued_at IS NOT NULL) OR status = 'void'",
)
export class InvoiceTypeormEntity extends AbstractEntity {
  @Column({ type: 'uuid' })
  @ForeignKey(() => ContractTypeormEntity, 'id', {
    name: 'FK_invoices_contract',
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  contractId: Uuid;

  @Column({ type: 'varchar', length: 32 })
  code: string;

  @Column({ type: 'varchar', length: 7, transformer: periodTransformer })
  period: ReadingPeriod;

  @Column({ type: 'numeric', precision: 14, scale: 4 })
  rentAmount: string;

  @Column({
    type: 'jsonb',
    default: () => "'[]'::jsonb",
    transformer: breakdownTransformer,
  })
  breakdown: InvoiceBreakdown;

  @Column({
    type: 'jsonb',
    default: () => "'[]'::jsonb",
    transformer: otherFeesTransformer,
  })
  otherFees: InvoiceOtherFees;

  @Column({ type: 'numeric', precision: 14, scale: 0 })
  totalAmount: string;

  @Column({
    type: 'enum',
    enum: InvoiceStatus,
    enumName: 'invoice_status_enum',
    default: InvoiceStatus.PENDING,
  })
  status: InvoiceStatus;

  @Column({ type: 'timestamptz', nullable: true })
  issuedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  @ForeignKey(() => InvoiceTypeormEntity, 'id', {
    name: 'FK_invoices_voided_invoice',
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  voidedInvoiceId: Uuid | null;

  @Column({ type: 'text', nullable: true })
  voidReason: string | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;
}
