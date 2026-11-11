import { DomainEvent } from 'shared/domain/base/domain-event';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import {
  CONTRACT_MEMBER_AGGREGATE_TYPE,
  CONTRACT_MEMBER_EVENTS,
} from '../constants/contract-member-event.constants';

export class ContractMemberLinkedEvent implements DomainEvent {
  readonly eventType = CONTRACT_MEMBER_EVENTS.LINKED;
  readonly routingKey = CONTRACT_MEMBER_EVENTS.LINKED;
  readonly aggregateType = CONTRACT_MEMBER_AGGREGATE_TYPE;
  readonly occurredAt = new Date();

  constructor(
    readonly aggregateId: Uuid,
    readonly contractId: Uuid,
    readonly tenantUserId: Uuid,
  ) {}

  get payload(): Record<string, unknown> {
    return {
      contractId: this.contractId,
      contractMemberId: this.aggregateId,
      tenantUserId: this.tenantUserId,
    };
  }
}
