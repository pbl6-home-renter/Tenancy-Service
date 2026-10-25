import { DomainEvent } from 'shared/domain/base/domain-event';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import {
  ROOM_AGGREGATE_TYPE,
  ROOM_EVENTS,
} from '../constants/room-event.constants';
import { RoomFields } from '../entities/room.props';
import { RoomStatus } from '../enums/room-status.enum';

export class RoomCreatedEvent implements DomainEvent {
  readonly eventType = ROOM_EVENTS.CREATED;
  readonly routingKey = ROOM_EVENTS.CREATED;
  readonly aggregateType = ROOM_AGGREGATE_TYPE;
  readonly occurredAt = new Date();
  readonly payload: Record<string, unknown>;

  constructor(
    readonly aggregateId: Uuid,
    fields: RoomFields,
  ) {
    this.payload = {
      id: aggregateId,
      ...fields,
      amenities: { ...fields.amenities },
      status: RoomStatus.AVAILABLE,
    };
  }
}
