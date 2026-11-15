import { AggregateRoot } from 'shared/domain/base/aggregate-root';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ContractSuspensionNotificationRequestedEvent } from '../events/contract-suspension-notification-requested.event';
import { ContractLockResolutionNotificationRequestedEvent } from '../events/contract-lock-resolution-notification-requested.event';
import { ContractLockDecisionConflictException } from '../exceptions/contract-lock-decision-conflict.exception';
import { ContractLockDecisionInvalidException } from '../exceptions/contract-lock-decision-invalid.exception';
import { LandlordLockCycleNotAwaitingDecisionException } from '../exceptions/landlord-lock-cycle-not-awaiting-decision.exception';
import {
  CreateLandlordLockCycleProps,
  LandlordLockCycleProps,
  ContractLockDecision,
  ContractLockDecisionAction,
} from './landlord-lock-cycle.props';

export class LandlordLockCycleEntity extends AggregateRoot {
  private _unlockedAt: Date | null;
  private readonly _decisions: Record<string, ContractLockDecision>;
  private constructor(
    props: LandlordLockCycleProps,
    readonly landlordId: Uuid,
    readonly lockedAt: Date,
    readonly graceDeadline: Date,
    private readonly _contractIds: Uuid[],
    private _state: LandlordLockCycleProps['state'],
  ) {
    super(props.id, props.createdAt, props.updatedAt, props.isDeleted);
    this._unlockedAt = props.unlockedAt ? new Date(props.unlockedAt) : null;
    this._decisions = structuredClone(props.decisions ?? {});
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

  get unlockedAt(): Date | null {
    return this._unlockedAt ? new Date(this._unlockedAt) : null;
  }

  get decisions(): Record<string, ContractLockDecision> {
    return structuredClone(this._decisions);
  }

  beginDecision(unlockedAt: Date, contractIds: Uuid[]): boolean {
    if (!Number.isFinite(unlockedAt.getTime()))
      throw new ValidationException('Invalid landlord unlock time');
    if (
      !['pending', 'elapsed'].includes(this.state) ||
      unlockedAt < this.lockedAt ||
      unlockedAt >= this.graceDeadline
    )
      return false;
    this._unlockedAt = new Date(unlockedAt);
    this._state = contractIds.length ? 'decision_pending' : 'completed';
    this.updatedAt.setTime(Date.now());
    if (contractIds.length)
      this.requestResolutionNotification(
        this.landlordId,
        contractIds,
        'decision_required',
      );
    return true;
  }

  recordReconciliation(at: Date): void {
    this.updatedAt.setTime(at.getTime());
  }

  recordDecision(
    contractId: Uuid,
    action: ContractLockDecisionAction,
    at: Date,
    origin: ContractLockDecision['origin'],
  ): void {
    const previous = this._decisions[contractId];
    if (previous) {
      if (previous.action !== action)
        throw new ContractLockDecisionConflictException();
      return;
    }
    if (
      (origin === 'landlord' && this.state !== 'decision_pending') ||
      (origin === 'grace_expired' &&
        !['pending', 'elapsed'].includes(this.state))
    )
      throw new LandlordLockCycleNotAwaitingDecisionException();
    if (!this._contractIds.includes(contractId))
      throw new ContractLockDecisionInvalidException();
    this._decisions[contractId] = {
      action,
      decidedAt: at.toISOString(),
      origin,
    };
    this.updatedAt.setTime(at.getTime());
  }

  completeIfResolved(remainingContractIds: Uuid[]): void {
    if (remainingContractIds.length === 0) {
      this._state = 'completed';
      this.updatedAt.setTime(Date.now());
    }
  }

  requestResolutionNotification(
    recipientUserId: Uuid,
    contractIds: Uuid[],
    action: 'decision_required' | ContractLockDecisionAction,
  ): void {
    this.addDomainEvent(
      new ContractLockResolutionNotificationRequestedEvent(
        this,
        recipientUserId,
        contractIds,
        action,
      ),
    );
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
