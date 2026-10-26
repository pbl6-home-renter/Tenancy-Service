import { DomainEvent } from 'shared/domain/base/domain-event';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import {
  BUILDING_AGGREGATE_TYPE,
  BUILDING_EVENTS,
} from '../constants/building-event.constants';

export class BuildingDeletedEvent implements DomainEvent {
  readonly eventType = BUILDING_EVENTS.DELETED;
  readonly routingKey = BUILDING_EVENTS.DELETED;
  readonly aggregateType = BUILDING_AGGREGATE_TYPE;
  readonly occurredAt = new Date();

  constructor(readonly aggregateId: Uuid) {}

  get payload(): Record<string, unknown> {
    return { id: this.aggregateId };
  }
}
