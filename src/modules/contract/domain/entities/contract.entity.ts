import { AggregateRoot } from 'shared/domain/base/aggregate-root';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import {
  generateUuid,
  isValidUuid,
  Uuid,
} from 'shared/domain/value-objects/uuid.vo';
import { ContractStatus } from '../enums/contract-status.enum';
import { ContractCreatedEvent } from '../events/contract-created.event';
import { ContractUpdatedEvent } from '../events/contract-updated.event';
import { ContractActivatedEvent } from '../events/contract-activated.event';
import { ContractNotFoundException } from '../exceptions/contract-not-found.exception';
import { ContractNotDraftException } from '../exceptions/contract-not-draft.exception';
import { ContractNotReadyException } from '../exceptions/contract-not-ready.exception';
import { TenantIdentityInvalidException } from '../exceptions/tenant-identity-invalid.exception';
import {
  ContractProps,
  CreateContractProps,
  UpdateContractProps,
} from './contract.props';

export class ContractEntity extends AggregateRoot {
  private constructor(
    id: Uuid,
    private readonly _landlordId: Uuid,
    private readonly _roomId: Uuid,
    private readonly _tenantId: Uuid | null,
    private readonly _tenantName: string | null,
    private readonly _tenantPhone: string | null,
    private readonly _depositAmount: number,
    private readonly _rentPrice: number,
    private readonly _startDate: string,
    private readonly _endDate: string,
    private readonly _vehicleCount: number | null,
    private _status: ContractStatus,
    private _description: string | null,
    createdAt: Date,
    updatedAt: Date,
    isDeleted: boolean,
  ) {
    super(id, createdAt, updatedAt, isDeleted);
  }

  static create(input: CreateContractProps): ContractEntity {
    const now = new Date();
    const contract = ContractEntity.reconstitute({
      ...input,
      id: generateUuid(),
      status: ContractStatus.DRAFT,
      description: null,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    });
    contract.addDomainEvent(
      new ContractCreatedEvent(
        contract.id,
        contract.roomId,
        contract.landlordId,
        contract.tenantId,
      ),
    );
    return contract;
  }

  static reconstitute(props: ContractProps): ContractEntity {
    ContractEntity.assertUuid('id', props.id);
    ContractEntity.validateProperties(props);
    if (!Object.values(ContractStatus).includes(props.status)) {
      throw new ValidationException('Invalid contract status');
    }
    ContractEntity.assertNullableText('description', props.description, 500);
    ContractEntity.assertTimestamp('createdAt', props.createdAt);
    ContractEntity.assertTimestamp('updatedAt', props.updatedAt);

    return new ContractEntity(
      props.id,
      props.landlordId,
      props.roomId,
      props.tenantId,
      props.tenantName,
      props.tenantPhone,
      props.depositAmount,
      props.rentPrice,
      props.startDate,
      props.endDate,
      props.vehicleCount,
      props.status,
      props.description,
      new Date(props.createdAt),
      new Date(props.updatedAt),
      props.isDeleted,
    );
  }

  get landlordId(): Uuid {
    return this._landlordId;
  }

  get roomId(): Uuid {
    return this._roomId;
  }

  get tenantId(): Uuid | null {
    return this._tenantId;
  }

  get tenantName(): string | null {
    return this._tenantName;
  }

  get tenantPhone(): string | null {
    return this._tenantPhone;
  }

  get depositAmount(): number {
    return this._depositAmount;
  }

  get rentPrice(): number {
    return this._rentPrice;
  }

  get startDate(): string {
    return this._startDate;
  }

  get endDate(): string {
    return this._endDate;
  }

  get vehicleCount(): number | null {
    return this._vehicleCount;
  }

  get status(): ContractStatus {
    return this._status;
  }

  get description(): string | null {
    return this._description;
  }

  updateDraft(input: UpdateContractProps): void {
    this.assertDraft();
    ContractEntity.assertNullableText('description', input.description, 500);
    this._description = input.description;
    this.recordUpdate();
  }

  /** The application verifies the signed artifact in Media before calling this. */
  activate(signedMediaId: Uuid, now: Date): void {
    this.assertNotDeleted();
    if (
      ![ContractStatus.DRAFT, ContractStatus.SIGNED].includes(this.status) ||
      !isValidUuid(signedMediaId)
    ) {
      throw new ContractNotReadyException(this.id);
    }
    ContractEntity.assertTimestamp('activation time', now);
    this._status = ContractStatus.ACTIVE;
    this.touch();
    this.addDomainEvent(
      new ContractActivatedEvent(
        this.id,
        this.roomId,
        this.landlordId,
        this.tenantId,
        now.toISOString(),
      ),
    );
  }

  private assertDraft(): void {
    this.assertNotDeleted();
    if (this.status !== ContractStatus.DRAFT) {
      throw new ContractNotDraftException(this.id);
    }
  }

  private assertNotDeleted(): void {
    if (this.isDeleted) throw new ContractNotFoundException(this.id);
  }

  private touch(): void {
    this.updatedAt.setTime(Date.now());
  }

  private recordUpdate(): void {
    this.touch();
    this.addDomainEvent(new ContractUpdatedEvent(this.id, this.description));
  }

  private static validateProperties(props: CreateContractProps): void {
    this.assertUuid('landlordId', props.landlordId);
    this.assertUuid('roomId', props.roomId);
    if (props.tenantId !== null) this.assertUuid('tenantId', props.tenantId);
    if (
      props.tenantId === null &&
      (typeof props.tenantName !== 'string' ||
        !props.tenantName.trim() ||
        typeof props.tenantPhone !== 'string' ||
        !props.tenantPhone.trim())
    ) {
      throw new TenantIdentityInvalidException();
    }
    this.assertNullableText('tenantName', props.tenantName, 254);
    if (
      props.tenantPhone !== null &&
      (typeof props.tenantPhone !== 'string' ||
        !/^(0[0-9]{9}|\+84[0-9]{9})$/.test(props.tenantPhone))
    ) {
      throw new ValidationException(
        'tenantPhone must be a valid Vietnamese phone number',
      );
    }
    for (const field of ['depositAmount', 'rentPrice'] as const) {
      if (!Number.isFinite(props[field]) || props[field] < 0) {
        throw new ValidationException(
          `${field} must be a non-negative finite number`,
        );
      }
    }
    if (
      props.vehicleCount !== null &&
      (!Number.isInteger(props.vehicleCount) ||
        props.vehicleCount < 0 ||
        props.vehicleCount > 2_147_483_647)
    ) {
      throw new ValidationException(
        'vehicleCount must be null or a non-negative integer',
      );
    }
    this.assertDate('startDate', props.startDate);
    this.assertDate('endDate', props.endDate);
    if (props.startDate >= props.endDate) {
      throw new ValidationException('startDate must be before endDate');
    }
  }

  private static assertUuid(field: string, value: Uuid): void {
    if (!isValidUuid(value))
      throw new ValidationException(`${field} must be a valid UUID`);
  }

  private static assertText(field: string, value: unknown, max: number): void {
    if (typeof value !== 'string' || !value.trim() || [...value].length > max) {
      throw new ValidationException(
        `${field} must contain 1–${max} characters`,
      );
    }
  }

  private static assertNullableText(
    field: string,
    value: string | null,
    max: number,
  ): void {
    if (value !== null) this.assertText(field, value, max);
  }

  private static assertDate(field: string, value: string): void {
    if (
      typeof value !== 'string' ||
      !/^(?!0000)\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
      throw new ValidationException(`${field} must be a valid YYYY-MM-DD date`);
    }
    const date = new Date(`${value}T00:00:00.000Z`);
    if (
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value
    ) {
      throw new ValidationException(`${field} must be a valid YYYY-MM-DD date`);
    }
  }

  private static assertTimestamp(field: string, value: Date): void {
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
      throw new ValidationException(`${field} must be a valid date`);
    }
  }
}
