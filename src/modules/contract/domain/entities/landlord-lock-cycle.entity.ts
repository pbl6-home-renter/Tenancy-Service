import { AggregateRoot } from 'shared/domain/base/aggregate-root';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ContractSuspensionNotificationRequestedEvent } from '../events/contract-suspension-notification-requested.event';

export interface LandlordLockCycleProps {
  id: Uuid;
  landlordId: Uuid;
  lockedAt: Date;
  graceDeadline: Date;
  contractIds: Uuid[];
  state: 'pending' | 'elapsed' | 'superseded';
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

export interface CreateLandlordLockCycleProps {
  id: Uuid;
  landlordId: Uuid;
  lockedAt: Date;
  gracePeriodMs: number;
  contractIds: Uuid[];
}

export class LandlordLockCycleEntity extends AggregateRoot {
  private constructor(
    props: LandlordLockCycleProps,
    readonly landlordId: Uuid,
    readonly lockedAt: Date,
    readonly graceDeadline: Date,
    private readonly _contractIds: Uuid[],
    private _state: LandlordLockCycleProps['state'],
  ) {
    super(props.id, props.createdAt, props.updatedAt, props.isDeleted);
  }

  static create(props: CreateLandlordLockCycleProps): LandlordLockCycleEntity {
    const { id, landlordId, lockedAt, gracePeriodMs, contractIds } = props;
    const graceDeadline = new Date(lockedAt.getTime() + gracePeriodMs);
    if (
      !Number.isSafeInteger(gracePeriodMs) ||
      gracePeriodMs <= 0 ||
      !Number.isFinite(graceDeadline.getTime())
    ) {
      throw new ValidationException('Invalid landlord lock grace period');
    }
    const now = new Date();
    return this.reconstitute({
      id,
      landlordId,
      lockedAt,
      graceDeadline,
      contractIds,
      state: 'pending',
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    });
  }

  static reconstitute(props: LandlordLockCycleProps): LandlordLockCycleEntity {
    return new LandlordLockCycleEntity(
      props,
      props.landlordId,
      new Date(props.lockedAt),
      new Date(props.graceDeadline),
      [...props.contractIds],
      props.state,
    );
  }

  get contractIds(): Uuid[] {
    return [...this._contractIds];
  }

  get state(): LandlordLockCycleProps['state'] {
    return this._state;
  }

  requestSuspensionNotification(
    recipientUserId: Uuid,
    contractIds: Uuid[],
  ): void {
    this.addDomainEvent(
      new ContractSuspensionNotificationRequestedEvent(
        this,
        [recipientUserId],
        contractIds,
      ),
    );
  }

  supersede(): void {
    this._state = 'superseded';
    this.updatedAt.setTime(Date.now());
  }

  reachGraceDeadline(now: Date): boolean {
    if (this._state !== 'pending' || now < this.graceDeadline) return false;
    this._state = 'elapsed';
    this.updatedAt.setTime(now.getTime());
    return true;
  }
}
