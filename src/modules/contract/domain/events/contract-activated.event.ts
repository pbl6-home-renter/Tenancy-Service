import { DomainEvent } from 'shared/domain/base/domain-event';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import {
  CONTRACT_AGGREGATE_TYPE,
  CONTRACT_EVENTS,
} from '../constants/contract-event.constants';
import { ContractStatus } from '../enums/contract-status.enum';

export class ContractActivatedEvent implements DomainEvent {
  readonly eventType = CONTRACT_EVENTS.ACTIVATED;
  readonly routingKey = CONTRACT_EVENTS.ACTIVATED;
  readonly aggregateType = CONTRACT_AGGREGATE_TYPE;
  readonly occurredAt = new Date();

  constructor(
    readonly aggregateId: Uuid,
    readonly roomId: Uuid,
    readonly buildingId: Uuid,
    readonly landlordId: Uuid,
    readonly tenantId: Uuid | null,
    readonly tenantUserIds: Uuid[],
    readonly activatedAt: string,
  ) {}

  get payload(): Record<string, unknown> {
    return {
      id: this.aggregateId,
      contractId: this.aggregateId,
      roomId: this.roomId,
      buildingId: this.buildingId,
      landlordId: this.landlordId,
      tenantId: this.tenantId,
      tenantUserIds: this.tenantUserIds,
      activatedAt: this.activatedAt,
      status: ContractStatus.ACTIVE,
    };
  }
}
