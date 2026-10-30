import { DomainEvent } from 'shared/domain/base/domain-event';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import {
  CONTRACT_AGGREGATE_TYPE,
  CONTRACT_EVENTS,
} from '../constants/contract-event.constants';
import { ContractStatus } from '../enums/contract-status.enum';

export class ContractCreatedEvent implements DomainEvent {
  readonly eventType = CONTRACT_EVENTS.CREATED;
  readonly routingKey = CONTRACT_EVENTS.CREATED;
  readonly aggregateType = CONTRACT_AGGREGATE_TYPE;
  readonly occurredAt = new Date();

  constructor(
    readonly aggregateId: Uuid,
    readonly roomId: Uuid,
    readonly landlordId: Uuid,
    readonly tenantId: Uuid | null,
  ) {}

  get payload(): Record<string, unknown> {
    return {
      id: this.aggregateId,
      roomId: this.roomId,
      landlordId: this.landlordId,
      tenantId: this.tenantId,
      status: ContractStatus.DRAFT,
    };
  }
}
