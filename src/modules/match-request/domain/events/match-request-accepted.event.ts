import { DomainEvent } from 'shared/domain/base/domain-event';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import {
  MATCH_REQUEST_AGGREGATE_TYPE,
  MATCH_REQUEST_EVENTS,
} from '../constants/match-request-event.constants';

export class MatchRequestAcceptedEvent implements DomainEvent {
  readonly eventType = MATCH_REQUEST_EVENTS.ACCEPTED;
  readonly routingKey = MATCH_REQUEST_EVENTS.ACCEPTED;
  readonly aggregateType = MATCH_REQUEST_AGGREGATE_TYPE;
  readonly payload: Record<string, unknown>;

  constructor(
    readonly aggregateId: Uuid,
    actorUserId: Uuid,
    recipientUserId: Uuid,
    readonly occurredAt: Date,
  ) {
    this.payload = {
      matchRequestId: aggregateId,
      actorUserId,
      recipientUserId,
    };
  }
}
