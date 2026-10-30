import { AggregateRoot } from 'shared/domain/base/aggregate-root';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import {
  generateUuid,
  isValidUuid,
  Uuid,
} from 'shared/domain/value-objects/uuid.vo';
import { RatePolicyScope } from '../enums/rate-policy-scope.enum';
import { RatePolicyCreatedEvent } from '../events/rate-policy-created.event';
import { RatePolicyDeactivatedEvent } from '../events/rate-policy-deactivated.event';
import { RatePolicyUpdatedEvent } from '../events/rate-policy-updated.event';
import { PolicyNotActiveException } from '../exceptions/policy-not-active.exception';
import { RateItem } from '../value-objects/rate-item.vo';
import { CreateRatePolicyProps, RatePolicyProps } from './rate-policy.props';

export class RatePolicyEntity extends AggregateRoot {
  private _rates: RateItem[];
  private _isActive: boolean;

  private constructor(
    id: Uuid,
    readonly landlordId: Uuid,
    readonly scope: RatePolicyScope,
    readonly buildingId: Uuid | null,
    readonly roomId: Uuid | null,
    rates: RateItem[],
    isActive: boolean,
    createdAt: Date,
    updatedAt: Date,
    isDeleted: boolean,
  ) {
    super(id, createdAt, updatedAt, isDeleted);
    this._rates = [...rates];
    this._isActive = isActive;
  }

  static create(input: CreateRatePolicyProps): RatePolicyEntity {
    const now = new Date();
    const policy = RatePolicyEntity.reconstitute({
      ...input,
      id: generateUuid(),
      isActive: true,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    });
    policy.addDomainEvent(new RatePolicyCreatedEvent(...policy.eventArgs()));
    return policy;
  }

  static reconstitute(props: RatePolicyProps): RatePolicyEntity {
    if (!isValidUuid(props.id) || !isValidUuid(props.landlordId)) {
      throw new ValidationException(
        'Rate policy id and landlordId must be UUIDs',
      );
    }
    if (props.scope === RatePolicyScope.BUILDING) {
      if (!isValidUuid(props.buildingId) || props.roomId !== null) {
        throw new ValidationException(
          'Building policy requires buildingId only',
        );
      }
    } else if (props.scope === RatePolicyScope.ROOM) {
      if (!isValidUuid(props.roomId) || !isValidUuid(props.buildingId)) {
        throw new ValidationException(
          'Room policy requires roomId and its buildingId',
        );
      }
    } else {
      throw new ValidationException('Invalid rate policy scope');
    }
    this.validateRates(props.rates);
    if (typeof props.isActive !== 'boolean') {
      throw new ValidationException('isActive must be boolean');
    }
    return new RatePolicyEntity(
      props.id,
      props.landlordId,
      props.scope,
      props.buildingId,
      props.roomId,
      props.rates,
      props.isActive,
      new Date(props.createdAt),
      new Date(props.updatedAt),
      props.isDeleted,
    );
  }

  get rates(): readonly RateItem[] {
    return [...this._rates];
  }

  get isActive(): boolean {
    return this._isActive;
  }

  replaceRates(rates: RateItem[]): void {
    RatePolicyEntity.validateRates(rates);
    this._rates = [...rates];
    this.touch();
    this.addDomainEvent(new RatePolicyUpdatedEvent(...this.eventArgs()));
  }

  activate(): void {
    if (this._isActive) return;
    this._isActive = true;
    this.touch();
    this.addDomainEvent(new RatePolicyUpdatedEvent(...this.eventArgs()));
  }

  deactivate(): void {
    if (!this._isActive) throw new PolicyNotActiveException();
    this._isActive = false;
    this.touch();
    this.addDomainEvent(new RatePolicyDeactivatedEvent(...this.eventArgs()));
  }

  override markAsDeleted(): void {
    throw new ValidationException('Rate policies cannot be deleted');
  }

  private touch(): void {
    this.updatedAt.setTime(Date.now());
  }

  private eventArgs(): [
    Uuid,
    Uuid,
    RatePolicyScope,
    Uuid | null,
    Uuid | null,
    boolean,
  ] {
    return [
      this.id,
      this.landlordId,
      this.scope,
      this.buildingId,
      this.roomId,
      this.isActive,
    ];
  }

  private static validateRates(rates: RateItem[]): void {
    if (!Array.isArray(rates) || !rates.length) {
      throw new ValidationException('Rate policy requires at least one rate');
    }
    if (rates.some((rate) => !(rate instanceof RateItem))) {
      throw new ValidationException('Rate policy contains an invalid rate');
    }
    const types = rates.map((rate) => rate.type);
    if (new Set(types).size !== types.length) {
      throw new ValidationException('Rate policy cannot repeat a rate type');
    }
  }
}
