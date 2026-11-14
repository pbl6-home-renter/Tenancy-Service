import { AggregateRoot } from 'shared/domain/base/aggregate-root';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import {
  generateUuid,
  isValidUuid,
  Uuid,
} from 'shared/domain/value-objects/uuid.vo';
import { ContractStatus } from '../enums/contract-status.enum';
import { MediaReference } from 'modules/media/domain/value-objects/media-reference.vo';
import { ContractCreatedEvent } from '../events/contract-created.event';
import { ContractUpdatedEvent } from '../events/contract-updated.event';
import { ContractActivatedEvent } from '../events/contract-activated.event';
import { ContractTerminatedEvent } from '../events/contract-terminated.event';
import { ContractNotActiveException } from '../exceptions/contract-not-active.exception';
import { ContractNotFoundException } from '../exceptions/contract-not-found.exception';
import { ContractNotDraftException } from '../exceptions/contract-not-draft.exception';
import { ContractNotReadyException } from '../exceptions/contract-not-ready.exception';
import { TenantIdentityInvalidException } from '../exceptions/tenant-identity-invalid.exception';
import { TenantPhone } from '../value-objects/tenant-phone.vo';
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
    private _tenantId: Uuid | null,
    private readonly _tenantName: string | null,
    private readonly _tenantPhone: string | null,
    private readonly _depositAmount: number,
    private readonly _rentPrice: number,
    private readonly _startDate: string,
    private readonly _endDate: string,
    private _vehicleCount: number | null,
    private _status: ContractStatus,
    private _description: string | null,
    private _activatedAt: Date | null,
    private _signedContractMedia: MediaReference[],
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
      activatedAt: null,
      signedContractMediaIds: [],
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
    if (props.activatedAt !== null) {
      ContractEntity.assertTimestamp('activatedAt', props.activatedAt);
    }
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
      props.activatedAt === null ? null : new Date(props.activatedAt),
      (props.signedContractMediaIds ?? []).map(MediaReference.create),
      new Date(props.createdAt),
      new Date(props.updatedAt),
      props.isDeleted,
    );
  }

  linkTenant(userId: Uuid, phone: TenantPhone): boolean {
    ContractEntity.assertUuid('tenantId', userId);
    if (
      this.isDeleted ||
      this._tenantId !== null ||
      this._tenantPhone === null ||
      !TenantPhone.create(this._tenantPhone).equals(phone)
    ) {
      return false;
    }
    this._tenantId = userId;
    this.updatedAt.setTime(Date.now());
    return true;
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

  isActiveDuring(start: string, end: string): boolean {
    return (
      this._status === ContractStatus.ACTIVE &&
      this._startDate <= end &&
      this._endDate >= start
    );
  }

  get description(): string | null {
    return this._description;
  }

  get activatedAt(): Date | null {
    return this._activatedAt === null ? null : new Date(this._activatedAt);
  }

  get signedContractMediaIds(): Uuid[] {
    return this._signedContractMedia.map((reference) => reference.mediaId);
  }

  updateDraft(input: UpdateContractProps): void {
    this.assertDraft();
    if (input.vehicleCount !== undefined) {
      throw new ContractNotDraftException(this.id);
    }
    if (input.description === undefined) {
      throw new ValidationException(
        'description is required for a draft update',
      );
    }
    ContractEntity.assertNullableText('description', input.description, 500);
    this._description = input.description;
    this.recordUpdate();
  }

  updateActive(input: UpdateContractProps): void {
    this.assertNotDeleted();
    if (
      this.status !== ContractStatus.ACTIVE ||
      Object.keys(input).some(
        (field) => field !== 'vehicleCount' && field !== 'description',
      )
    ) {
      throw new ContractNotDraftException(this.id);
    }
    if (input.vehicleCount === undefined && input.description === undefined) {
      throw new ValidationException('At least one update field is required');
    }
    if (
      input.vehicleCount !== undefined &&
      input.vehicleCount !== null &&
      (!Number.isInteger(input.vehicleCount) ||
        input.vehicleCount < 0 ||
        input.vehicleCount > 2_147_483_647)
    ) {
      throw new ValidationException(
        'vehicleCount must be null or a non-negative integer',
      );
    }
    if (input.description !== undefined) {
      ContractEntity.assertNullableText('description', input.description, 500);
    }
    if (input.vehicleCount !== undefined) {
      this._vehicleCount = input.vehicleCount;
    }
    if (input.description !== undefined) {
      this._description = input.description;
    }
    this.recordUpdate();
  }

  suspend(): void {
    this.assertNotDeleted();
    if (this.status !== ContractStatus.ACTIVE) {
      throw new ContractNotActiveException();
    }
    this._status = ContractStatus.SUSPENDED;
    this.touch();
  }

  terminate(completedOn: Date): void {
    this.assertNotDeleted();
    if (this.status !== ContractStatus.ACTIVE) {
      throw new ContractNotActiveException();
    }
    ContractEntity.assertTimestamp('completedOn', completedOn);
    const checkoutDate = new Date(completedOn);
    checkoutDate.setUTCHours(0, 0, 0, 0);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (
      checkoutDate.getUTCFullYear() < 1 ||
      checkoutDate.getUTCFullYear() > 9999 ||
      checkoutDate.getTime() < new Date(this.startDate).getTime() ||
      checkoutDate.getTime() > today.getTime()
    ) {
      throw new ValidationException(
        'completedOn must be between the contract start date and today',
      );
    }
    this._status = ContractStatus.TERMINATED;
    this.touch();
    this.addDomainEvent(
      new ContractTerminatedEvent(
        this.id,
        this.roomId,
        this.landlordId,
        checkoutDate,
      ),
    );
  }

  /** The application verifies the signed artifact in Media before calling this. */
  activate(
    signedMediaIds: Uuid[],
    now: Date,
    buildingId: Uuid,
    tenantUserIds: Uuid[],
  ): void {
    this.assertNotDeleted();
    if (
      ![ContractStatus.DRAFT, ContractStatus.SIGNED].includes(this.status) ||
      signedMediaIds.length === 0 ||
      !signedMediaIds.every(isValidUuid) ||
      new Set(signedMediaIds).size !== signedMediaIds.length
    ) {
      throw new ContractNotReadyException(this.id);
    }
    ContractEntity.assertTimestamp('activation time', now);
    this._status = ContractStatus.ACTIVE;
    this._activatedAt = new Date(now);
    this._signedContractMedia = signedMediaIds.map(MediaReference.create);
    this.touch();
    this.addDomainEvent(
      new ContractActivatedEvent(
        this.id,
        this.roomId,
        buildingId,
        this.landlordId,
        this.tenantId,
        tenantUserIds,
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
