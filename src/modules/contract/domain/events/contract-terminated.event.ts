import { DomainEvent } from 'shared/domain/base/domain-event';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import {
  CONTRACT_AGGREGATE_TYPE,
  CONTRACT_EVENTS,
} from '../constants/contract-event.constants';
import { ContractStatus } from '../enums/contract-status.enum';

export class ContractTerminatedEvent implements DomainEvent {
  readonly eventType = CONTRACT_EVENTS.TERMINATED;
  readonly routingKey = CONTRACT_EVENTS.TERMINATED;
  readonly aggregateType = CONTRACT_AGGREGATE_TYPE;
  readonly occurredAt = new Date();

  constructor(
    readonly aggregateId: Uuid,
    readonly roomId: Uuid,
    readonly landlordId: Uuid,
    readonly completedOn: Date,
  ) {}

  get payload(): Record<string, unknown> {
    return {
      id: this.aggregateId,
      roomId: this.roomId,
      landlordId: this.landlordId,
      completedOn: this.completedOn.toISOString().slice(0, 10),
      status: ContractStatus.TERMINATED,
    };
  }
}
