import { DomainEvent } from 'shared/domain/base/domain-event';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import {
  ROOM_AGGREGATE_TYPE,
  ROOM_EVENTS,
} from '../constants/room-event.constants';

export class RoomDeletedEvent implements DomainEvent {
  readonly eventType = ROOM_EVENTS.DELETED;
  readonly routingKey = ROOM_EVENTS.DELETED;
  readonly aggregateType = ROOM_AGGREGATE_TYPE;
  readonly occurredAt = new Date();
  readonly payload: Record<string, unknown>;

  constructor(readonly aggregateId: Uuid) {
    this.payload = { id: aggregateId };
  }
}
