import { DomainEvent } from 'shared/domain/base/domain-event';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { RatePolicyScope } from '../enums/rate-policy-scope.enum';
import { RATE_POLICY_AGGREGATE_TYPE } from '../constants/rate-policy-event.constants';

export abstract class RatePolicyEvent implements DomainEvent {
  abstract readonly eventType: string;
  abstract readonly routingKey: string;
  readonly aggregateType = RATE_POLICY_AGGREGATE_TYPE;
  readonly occurredAt = new Date();

  constructor(
    readonly aggregateId: Uuid,
    readonly landlordId: Uuid,
    readonly scope: RatePolicyScope,
    readonly buildingId: Uuid | null,
    readonly roomId: Uuid | null,
    readonly isActive: boolean,
  ) {}

  get payload(): Record<string, unknown> {
    return {
      id: this.aggregateId,
      landlordId: this.landlordId,
      scope: this.scope,
      buildingId: this.buildingId,
      roomId: this.roomId,
      isActive: this.isActive,
    };
  }
}
