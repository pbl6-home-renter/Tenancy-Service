import { DomainEvent } from 'shared/domain/base/domain-event';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import {
  BUILDING_AGGREGATE_TYPE,
  BUILDING_EVENTS,
} from '../constants/building-event.constants';
import { BuildingStatus } from '../enums/building-status.enum';

export class BuildingApprovedEvent implements DomainEvent {
  readonly eventType = BUILDING_EVENTS.APPROVED;
  readonly routingKey = BUILDING_EVENTS.APPROVED;
  readonly aggregateType = BUILDING_AGGREGATE_TYPE;
  readonly occurredAt = new Date();

  constructor(
    readonly aggregateId: Uuid,
    readonly reviewedBy: Uuid,
    readonly reviewedAt: string,
    readonly note: string | null,
  ) {}

  get payload(): Record<string, unknown> {
    return {
      id: this.aggregateId,
      status: BuildingStatus.APPROVED,
      reviewedBy: this.reviewedBy,
      reviewedAt: this.reviewedAt,
      note: this.note,
    };
  }
}
