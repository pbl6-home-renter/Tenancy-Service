import { DomainEvent } from 'shared/domain/base/domain-event';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export class InvoiceNotificationRequestedEvent implements DomainEvent {
  readonly eventType = 'notification.requested';
  readonly routingKey = 'notification.requested';
  readonly aggregateType = 'Invoice';
  readonly payload: Record<string, unknown>;

  constructor(
    readonly aggregateId: Uuid,
    contractId: Uuid,
    period: string,
    recipientUserIds: Uuid[],
    readonly occurredAt: Date,
  ) {
    this.payload = {
      sourceService: 'tenancy-service',
      recipientUserIds: [...recipientUserIds],
      notification: {
        type: 'invoice',
        title: 'Hóa đơn đã được phát hành',
        body: `Hóa đơn kỳ ${period} đã được phát hành.`,
        deepLink: `/invoices/${aggregateId}`,
        data: { invoiceId: aggregateId, contractId, period },
      },
    };
  }
}
