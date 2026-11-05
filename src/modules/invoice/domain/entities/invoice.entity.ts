import { AggregateRoot } from 'shared/domain/base/aggregate-root';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import {
  generateUuid,
  isValidUuid,
  Uuid,
} from 'shared/domain/value-objects/uuid.vo';
import { ReadingPeriod } from 'modules/meter-reading/domain/value-objects/reading-period.vo';
import { InvoiceStatus } from '../enums/invoice-status.enum';
import { InvoiceAlreadyIssuedException } from '../exceptions/invoice-already-issued.exception';
import { InvoiceAlreadyVoidedException } from '../exceptions/invoice-already-voided.exception';
import { InvoiceNotPendingException } from '../exceptions/invoice-not-pending.exception';
import { InvoiceEvent } from '../events/invoice.event';
import { InvoiceCode } from '../value-objects/invoice-code.vo';
import { InvoiceBreakdown } from '../value-objects/invoice-breakdown.vo';
import { InvoiceMoney } from '../value-objects/invoice-money.vo';
import { InvoiceOtherFees } from '../value-objects/invoice-other-fees.vo';
import {
  InvoiceCalculation,
  InvoiceLine,
  InvoiceOtherFee,
  InvoiceProps,
} from './invoice.props';

export class InvoiceEntity extends AggregateRoot {
  private _rentAmount: string;
  private _breakdown: InvoiceLine[];
  private _otherFees: InvoiceOtherFee[];
  private _totalAmount: string;
  private _status: InvoiceStatus;
  private _issuedAt: Date | null;
  private _voidReason: string | null;
  private _note: string | null;

  private constructor(
    id: Uuid,
    readonly contractId: Uuid,
    readonly code: InvoiceCode,
    readonly period: ReadingPeriod,
    readonly voidedInvoiceId: Uuid | null,
    props: InvoiceProps,
  ) {
    super(id, props.createdAt, props.updatedAt, props.isDeleted);
    this._rentAmount = props.rentAmount;
    this._breakdown = props.breakdown;
    this._otherFees = props.otherFees;
    this._totalAmount = props.totalAmount;
    this._status = props.status;
    this._issuedAt = props.issuedAt;
    this._voidReason = props.voidReason;
    this._note = props.note;
  }

  static create(input: {
    contractId: Uuid;
    period: string;
    calculation: InvoiceCalculation;
    voidedInvoiceId?: Uuid | null;
    code?: string;
  }): InvoiceEntity {
    const now = new Date();
    const period = ReadingPeriod.create(input.period);
    const values = this.normalize(input.calculation);
    const invoice = this.reconstitute({
      id: generateUuid(),
      contractId: input.contractId,
      code: input.code ?? InvoiceCode.generate(period).value,
      period: period.value,
      ...values,
      otherFees: [],
      totalAmount: InvoiceMoney.total([
        values.rentAmount,
        ...values.breakdown.map((line) => line.amount),
      ]),
      status: InvoiceStatus.PENDING,
      issuedAt: null,
      voidedInvoiceId: input.voidedInvoiceId ?? null,
      voidReason: null,
      note: null,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    });
    invoice.record('invoice.generated');
    return invoice;
  }

  static reconstitute(props: InvoiceProps): InvoiceEntity {
    if (
      !isValidUuid(props.id) ||
      !isValidUuid(props.contractId) ||
      (props.voidedInvoiceId !== null && !isValidUuid(props.voidedInvoiceId))
    ) {
      throw new ValidationException('Invoice IDs must be UUIDs');
    }
    if (!Object.values(InvoiceStatus).includes(props.status))
      throw new ValidationException('Invalid invoice status');
    if (
      (props.status === InvoiceStatus.PENDING && props.issuedAt !== null) ||
      (props.status === InvoiceStatus.ISSUED && props.issuedAt === null)
    ) {
      throw new ValidationException('Invoice issue time does not match status');
    }
    const values = this.normalize(props);
    const fees = this.normalizeFees(props.otherFees);
    const total = InvoiceMoney.total([
      values.rentAmount,
      ...values.breakdown.map((line) => line.amount),
      ...fees.map((fee) => fee.amount),
    ]);
    if (total !== props.totalAmount)
      throw new ValidationException('Invoice total does not match its lines');
    this.validateNote(props.note);
    return new InvoiceEntity(
      props.id,
      props.contractId,
      InvoiceCode.create(props.code),
      ReadingPeriod.create(props.period),
      props.voidedInvoiceId,
      {
        ...props,
        ...values,
        otherFees: fees,
        totalAmount: total,
      },
    );
  }

  get rentAmount(): string {
    return this._rentAmount;
  }
  get breakdown(): readonly InvoiceLine[] {
    return structuredClone(this._breakdown);
  }
  get otherFees(): readonly InvoiceOtherFee[] {
    return structuredClone(this._otherFees);
  }
  get totalAmount(): string {
    return this._totalAmount;
  }
  get status(): InvoiceStatus {
    return this._status;
  }
  get issuedAt(): Date | null {
    return this._issuedAt;
  }
  get voidReason(): string | null {
    return this._voidReason;
  }
  get note(): string | null {
    return this._note;
  }

  recalculate(calculation: InvoiceCalculation): void {
    this.requirePending();
    const values = InvoiceEntity.normalize(calculation);
    const total = InvoiceMoney.total([
      values.rentAmount,
      ...values.breakdown.map((line) => line.amount),
      ...this._otherFees.map((fee) => fee.amount),
    ]);
    this._rentAmount = values.rentAmount;
    this._breakdown = values.breakdown;
    this._totalAmount = total;
    this.touch();
    this.record('invoice.recalculated');
  }

  updateExtras(otherFees: InvoiceOtherFee[], note: string | null): void {
    this.requirePending();
    InvoiceEntity.validateNote(note);
    const fees = InvoiceEntity.normalizeFees(otherFees);
    const total = InvoiceMoney.total([
      this._rentAmount,
      ...this._breakdown.map((line) => line.amount),
      ...fees.map((fee) => fee.amount),
    ]);
    this._otherFees = fees;
    this._note = note;
    this._totalAmount = total;
    this.touch();
    this.record('invoice.updated');
  }

  issue(now = new Date()): void {
    if (this._status !== InvoiceStatus.PENDING)
      throw new InvoiceNotPendingException();
    this._status = InvoiceStatus.ISSUED;
    this._issuedAt = new Date(now);
    this.touch();
    this.record('invoice.issued');
  }

  void(reason: string): void {
    if (this._status === InvoiceStatus.VOID)
      throw new InvoiceAlreadyVoidedException();
    if (
      typeof reason !== 'string' ||
      reason.trim().length < 1 ||
      reason.trim().length > 500
    )
      throw new ValidationException(
        'Void reason must contain 1–500 characters',
      );
    this._status = InvoiceStatus.VOID;
    this._voidReason = reason.trim();
    this.touch();
    this.record('invoice.voided');
  }

  override markAsDeleted(): void {
    throw new ValidationException('Invoices cannot be deleted');
  }

  private requirePending(): void {
    if (this._status !== InvoiceStatus.PENDING)
      throw this._status === InvoiceStatus.ISSUED
        ? new InvoiceAlreadyIssuedException()
        : new InvoiceAlreadyVoidedException();
  }

  private touch(): void {
    this.updatedAt.setTime(Date.now());
  }
  private record(type: string): void {
    this.addDomainEvent(
      new InvoiceEvent(type, this.id, this.contractId, this.period.value),
    );
  }

  private static normalize(
    calculation: InvoiceCalculation,
  ): InvoiceCalculation {
    return {
      rentAmount: InvoiceMoney.line(calculation.rentAmount),
      breakdown: InvoiceBreakdown.create(calculation.breakdown).value,
    };
  }

  private static normalizeFees(fees: InvoiceOtherFee[]): InvoiceOtherFee[] {
    return InvoiceOtherFees.create(fees).value;
  }

  private static validateNote(note: string | null): void {
    if (note !== null && (typeof note !== 'string' || note.length > 500))
      throw new ValidationException('Note must be at most 500 characters');
  }
}
