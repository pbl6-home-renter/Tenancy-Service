import { DomainEvent } from 'shared/domain/base/domain-event';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import {
  ROOM_AGGREGATE_TYPE,
  ROOM_EVENTS,
} from '../constants/room-event.constants';
import { RoomStatus } from '../enums/room-status.enum';

export class RoomStatusChangedEvent implements DomainEvent {
  readonly eventType = ROOM_EVENTS.STATUS_CHANGED;
  readonly routingKey = ROOM_EVENTS.STATUS_CHANGED;
  readonly aggregateType = ROOM_AGGREGATE_TYPE;
  readonly occurredAt = new Date();
  readonly payload: Record<string, unknown>;

  constructor(
    readonly aggregateId: Uuid,
    previousStatus: RoomStatus,
    status: RoomStatus,
  ) {
    this.payload = {
      id: aggregateId,
      previousStatus,
      status,
    };
  }
}
