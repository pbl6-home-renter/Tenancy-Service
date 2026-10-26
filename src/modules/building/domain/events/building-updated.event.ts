import { DomainEvent } from 'shared/domain/base/domain-event';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import {
  BUILDING_AGGREGATE_TYPE,
  BUILDING_EVENTS,
} from '../constants/building-event.constants';

export class BuildingUpdatedEvent implements DomainEvent {
  readonly eventType = BUILDING_EVENTS.UPDATED;
  readonly routingKey = BUILDING_EVENTS.UPDATED;
  readonly aggregateType = BUILDING_AGGREGATE_TYPE;
  readonly occurredAt = new Date();

  constructor(
    readonly aggregateId: Uuid,
    readonly name: string,
    readonly province: string,
    readonly ward: string,
    readonly address: string,
    readonly latitude: number,
    readonly longitude: number,
  ) {}

  get payload(): Record<string, unknown> {
    return {
      id: this.aggregateId,
      name: this.name,
      province: this.province,
      ward: this.ward,
      address: this.address,
      latitude: this.latitude,
      longitude: this.longitude,
    };
  }
}
