import { DomainEvent } from 'shared/domain/base/domain-event';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import {
  METER_READING_AGGREGATE_TYPE,
  METER_READING_EVENTS,
} from '../constants/meter-reading-event.constants';
import { MeterType } from '../enums/meter-type.enum';

export class MeterReadingRecordedEvent implements DomainEvent {
  readonly eventType = METER_READING_EVENTS.RECORDED;
  readonly routingKey = METER_READING_EVENTS.RECORDED;
  readonly aggregateType = METER_READING_AGGREGATE_TYPE;
  readonly occurredAt = new Date();

  constructor(
    readonly aggregateId: Uuid,
    readonly roomId: Uuid,
    readonly buildingId: Uuid,
    readonly type: MeterType,
    readonly period: string,
    readonly previousReading: string,
    readonly currentReading: string,
  ) {}

  get payload(): Record<string, unknown> {
    return {
      id: this.aggregateId,
      roomId: this.roomId,
      buildingId: this.buildingId,
      type: this.type,
      period: this.period,
      previousReading: this.previousReading,
      currentReading: this.currentReading,
    };
  }
}
