import { AggregateRoot } from 'shared/domain/base/aggregate-root';
import { Uuid, generateUuid } from 'shared/domain/value-objects/uuid.vo';
import { MatchRequestStatus } from '../enums/match-request-status.enum';
import { MatchRequestCreatedEvent } from '../events/match-request-created.event';
import { MatchRequestAcceptedEvent } from '../events/match-request-accepted.event';
import { MatchRequestRejectedEvent } from '../events/match-request-rejected.event';
import { MatchRequestWithdrawnEvent } from '../events/match-request-withdrawn.event';
import { MatchRequestForbiddenException } from '../exceptions/match-request-forbidden.exception';
import { MatchRequestNotPendingException } from '../exceptions/match-request-not-pending.exception';
import { SelfMatchingNotAllowedException } from '../exceptions/self-matching-not-allowed.exception';

export interface MatchRequestProps {
  id?: Uuid;
  requesterId: Uuid;
  targetId: Uuid;
  idempotencyKey: Uuid;
  status?: MatchRequestStatus;
  respondedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  isDeleted?: boolean;
}

export class MatchRequestEntity extends AggregateRoot {
  private _status: MatchRequestStatus;
  private _respondedAt: Date | null;

  private constructor(
    id: Uuid,
    readonly requesterId: Uuid,
    readonly targetId: Uuid,
    readonly idempotencyKey: Uuid,
    status: MatchRequestStatus,
    respondedAt: Date | null,
    createdAt: Date,
    updatedAt: Date,
    isDeleted: boolean,
  ) {
    super(id, createdAt, updatedAt, isDeleted);
    this._status = status;
    this._respondedAt = respondedAt;
  }

  static create(
    requesterId: Uuid,
    targetId: Uuid,
    idempotencyKey: Uuid,
  ): MatchRequestEntity {
    if (requesterId.toLowerCase() === targetId.toLowerCase()) {
      throw new SelfMatchingNotAllowedException();
    }
    const now = new Date();
    const request = MatchRequestEntity.reconstitute({
      id: generateUuid(),
      requesterId,
      targetId,
      idempotencyKey,
      status: MatchRequestStatus.PENDING,
      createdAt: now,
      updatedAt: now,
    });
    request.addDomainEvent(
      new MatchRequestCreatedEvent(request.id, requesterId, targetId, now),
    );
    return request;
  }

  static reconstitute(props: MatchRequestProps): MatchRequestEntity {
    return new MatchRequestEntity(
      props.id ?? generateUuid(),
      props.requesterId,
      props.targetId,
      props.idempotencyKey,
      props.status ?? MatchRequestStatus.PENDING,
      props.respondedAt ?? null,
      props.createdAt ?? new Date(),
      props.updatedAt ?? new Date(),
      props.isDeleted ?? false,
    );
  }

  get status(): MatchRequestStatus {
    return this._status;
  }
  get respondedAt(): Date | null {
    return this._respondedAt;
  }

  /** Validate authorization, terminal state and replay without mutating the request. */
  canTransition(actorId: Uuid, next: MatchRequestStatus): boolean {
    const permittedActor =
      next === MatchRequestStatus.WITHDRAWN ? this.requesterId : this.targetId;
    if (actorId.toLowerCase() !== permittedActor.toLowerCase())
      throw new MatchRequestForbiddenException();
    if (this._status === next) return false;
    if (
      this._status !== MatchRequestStatus.PENDING ||
      next === MatchRequestStatus.PENDING
    ) {
      throw new MatchRequestNotPendingException();
    }
    return true;
  }

  transition(
    actorId: Uuid,
    next: MatchRequestStatus,
    at = new Date(),
  ): boolean {
    if (!this.canTransition(actorId, next)) return false;
    this._status = next;
    this._respondedAt = at;
    if (next === MatchRequestStatus.ACCEPTED)
      this.addDomainEvent(
        new MatchRequestAcceptedEvent(
          this.id,
          this.targetId,
          this.requesterId,
          at,
        ),
      );
    else if (next === MatchRequestStatus.REJECTED)
      this.addDomainEvent(
        new MatchRequestRejectedEvent(
          this.id,
          this.targetId,
          this.requesterId,
          at,
        ),
      );
    else
      this.addDomainEvent(
        new MatchRequestWithdrawnEvent(
          this.id,
          this.requesterId,
          this.targetId,
          at,
        ),
      );
    return true;
  }
}
