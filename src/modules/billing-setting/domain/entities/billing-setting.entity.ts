import { AggregateRoot } from 'shared/domain/base/aggregate-root';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import {
  generateUuid,
  isValidUuid,
  Uuid,
} from 'shared/domain/value-objects/uuid.vo';
import { BillingSettingScope } from '../enums/billing-setting-scope.enum';
import { BillingSettingCreatedEvent } from '../events/billing-setting-created.event';
import { BillingSettingUpdatedEvent } from '../events/billing-setting-updated.event';
import {
  BillingSettingProps,
  BillingSettingCreateProps,
  BillingSettingUpdateProps,
} from './billing-setting.props';

export class BillingSettingEntity extends AggregateRoot {
  private constructor(
    id: Uuid,
    readonly landlordId: Uuid,
    readonly scope: BillingSettingScope,
    readonly buildingId: Uuid,
    readonly roomId: Uuid | null,
    private _paymentDueDay: number,
    private _remindDay: number | null,
    private _botEnabled: boolean,
    private _isActive: boolean,
    createdAt: Date,
    updatedAt: Date,
    isDeleted: boolean,
  ) {
    super(id, createdAt, updatedAt, isDeleted);
  }

  static create(input: BillingSettingCreateProps): BillingSettingEntity {
    const now = new Date();
    const setting = BillingSettingEntity.reconstitute({
      ...input,
      id: generateUuid(),
      paymentDueDay: input.paymentDueDay ?? 5,
      remindDay: input.remindDay ?? null,
      botEnabled: input.botEnabled ?? true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    });
    setting.addDomainEvent(
      new BillingSettingCreatedEvent(...setting.eventArgs()),
    );
    return setting;
  }

  static reconstitute(props: BillingSettingProps): BillingSettingEntity {
    if (
      !isValidUuid(props.id) ||
      !isValidUuid(props.landlordId) ||
      !isValidUuid(props.buildingId)
    ) {
      throw new ValidationException('Billing setting IDs must be valid UUIDs');
    }
    if (props.scope === BillingSettingScope.BUILDING) {
      if (props.roomId !== null)
        throw new ValidationException('Building setting cannot have roomId');
    } else if (props.scope === BillingSettingScope.ROOM) {
      if (!isValidUuid(props.roomId))
        throw new ValidationException('Room setting requires roomId');
    } else {
      throw new ValidationException('Invalid billing setting scope');
    }
    BillingSettingEntity.validateDay('paymentDueDay', props.paymentDueDay);
    if (props.remindDay !== null)
      BillingSettingEntity.validateDay('remindDay', props.remindDay);
    if (
      typeof props.botEnabled !== 'boolean' ||
      typeof props.isActive !== 'boolean'
    ) {
      throw new ValidationException('botEnabled and isActive must be boolean');
    }
    if (
      Number.isNaN(props.createdAt.getTime()) ||
      Number.isNaN(props.updatedAt.getTime())
    ) {
      throw new ValidationException('Invalid billing setting timestamps');
    }
    return new BillingSettingEntity(
      props.id,
      props.landlordId,
      props.scope,
      props.buildingId,
      props.roomId,
      props.paymentDueDay,
      props.remindDay,
      props.botEnabled,
      props.isActive,
      new Date(props.createdAt),
      new Date(props.updatedAt),
      props.isDeleted,
    );
  }

  get paymentDueDay(): number {
    return this._paymentDueDay;
  }
  get remindDay(): number | null {
    return this._remindDay;
  }
  get botEnabled(): boolean {
    return this._botEnabled;
  }
  get isActive(): boolean {
    return this._isActive;
  }

  update(input: BillingSettingUpdateProps): void {
    if (this.isDeleted)
      throw new ValidationException(
        'Deleted billing setting cannot be updated',
      );
    if (Object.values(input).every((value) => value === undefined)) {
      throw new ValidationException(
        'At least one billing setting field is required',
      );
    }
    if (input.paymentDueDay !== undefined) {
      BillingSettingEntity.validateDay('paymentDueDay', input.paymentDueDay);
      this._paymentDueDay = input.paymentDueDay;
    }
    if (input.remindDay !== undefined) {
      if (input.remindDay !== null)
        BillingSettingEntity.validateDay('remindDay', input.remindDay);
      this._remindDay = input.remindDay;
    }
    if (input.botEnabled !== undefined) {
      if (typeof input.botEnabled !== 'boolean')
        throw new ValidationException('botEnabled must be boolean');
      this._botEnabled = input.botEnabled;
    }
    if (input.isActive !== undefined) {
      if (typeof input.isActive !== 'boolean')
        throw new ValidationException('isActive must be boolean');
      this._isActive = input.isActive;
    }
    this.updatedAt.setTime(Date.now());
    this.addDomainEvent(new BillingSettingUpdatedEvent(...this.eventArgs()));
  }

  private eventArgs(): [
    Uuid,
    Uuid,
    BillingSettingScope,
    Uuid,
    Uuid | null,
    number,
    number | null,
    boolean,
    boolean,
  ] {
    return [
      this.id,
      this.landlordId,
      this.scope,
      this.buildingId,
      this.roomId,
      this.paymentDueDay,
      this.remindDay,
      this.botEnabled,
      this.isActive,
    ];
  }

  private static validateDay(field: string, day: number): void {
    if (!Number.isInteger(day) || day < 1 || day > 28) {
      throw new ValidationException(`${field} must be an integer from 1 to 28`);
    }
  }
}
