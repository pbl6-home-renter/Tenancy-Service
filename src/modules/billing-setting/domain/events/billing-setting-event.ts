import { DomainEvent } from 'shared/domain/base/domain-event';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { BILLING_SETTING_AGGREGATE_TYPE } from '../constants/billing-setting-event.constants';
import { BillingSettingScope } from '../enums/billing-setting-scope.enum';

export abstract class BillingSettingEvent implements DomainEvent {
  abstract readonly eventType: string;
  abstract readonly routingKey: string;
  readonly aggregateType = BILLING_SETTING_AGGREGATE_TYPE;
  readonly occurredAt = new Date();

  constructor(
    readonly aggregateId: Uuid,
    readonly landlordId: Uuid,
    readonly scope: BillingSettingScope,
    readonly buildingId: Uuid,
    readonly roomId: Uuid | null,
    readonly paymentDueDay: number,
    readonly remindDay: number | null,
    readonly botEnabled: boolean,
    readonly isActive: boolean,
  ) {}

  get payload(): Record<string, unknown> {
    return {
      id: this.aggregateId,
      landlordId: this.landlordId,
      scope: this.scope,
      buildingId: this.buildingId,
      roomId: this.roomId,
      paymentDueDay: this.paymentDueDay,
      remindDay: this.remindDay,
      botEnabled: this.botEnabled,
      isActive: this.isActive,
    };
  }
}
