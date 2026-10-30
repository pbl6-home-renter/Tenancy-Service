import { DomainEvent } from 'shared/domain/base/domain-event';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import {
  CONTRACT_AGGREGATE_TYPE,
  CONTRACT_EVENTS,
} from '../constants/contract-event.constants';

export class ContractUpdatedEvent implements DomainEvent {
  readonly eventType = CONTRACT_EVENTS.UPDATED;
  readonly routingKey = CONTRACT_EVENTS.UPDATED;
  readonly aggregateType = CONTRACT_AGGREGATE_TYPE;
  readonly occurredAt = new Date();

  constructor(
    readonly aggregateId: Uuid,
    readonly description: string | null,
  ) {}

  get payload(): Record<string, unknown> {
    return {
      id: this.aggregateId,
      description: this.description,
    };
  }
}
