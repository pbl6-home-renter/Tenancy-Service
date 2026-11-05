import { DomainEvent } from 'shared/domain/base/domain-event';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export class InvoiceEvent implements DomainEvent {
  readonly routingKey: string;
  readonly aggregateType = 'Invoice';
  readonly occurredAt = new Date();
  readonly payload: Record<string, unknown>;

  constructor(
    readonly eventType: string,
    readonly aggregateId: Uuid,
    contractId: Uuid,
    period: string,
  ) {
    this.routingKey = eventType;
    this.payload = { invoiceId: aggregateId, contractId, period };
  }
}
