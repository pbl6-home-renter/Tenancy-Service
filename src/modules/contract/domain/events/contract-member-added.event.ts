import { DomainEvent } from 'shared/domain/base/domain-event';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import {
  CONTRACT_MEMBER_AGGREGATE_TYPE,
  CONTRACT_MEMBER_EVENTS,
} from '../constants/contract-member-event.constants';

export class ContractMemberAddedEvent implements DomainEvent {
  readonly eventType = CONTRACT_MEMBER_EVENTS.ADDED;
  readonly routingKey = CONTRACT_MEMBER_EVENTS.ADDED;
  readonly aggregateType = CONTRACT_MEMBER_AGGREGATE_TYPE;
  readonly occurredAt = new Date();

  constructor(
    readonly aggregateId: Uuid,
    readonly contractId: Uuid,
    readonly tenantId: Uuid | null,
    readonly joinedAt: Date,
  ) {}

  get payload(): Record<string, unknown> {
    return {
      id: this.aggregateId,
      contractId: this.contractId,
      tenantId: this.tenantId,
      joinedAt: this.joinedAt.toISOString().slice(0, 10),
    };
  }
}
