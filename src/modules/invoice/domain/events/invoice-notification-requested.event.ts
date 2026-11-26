import { DomainEvent } from 'shared/domain/base/domain-event';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { InvoiceNotificationCodeConstant } from '../constants/invoice-notification-code.constant';

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
        title: InvoiceNotificationCodeConstant.INVOICE_ISSUED_TITLE,
        body: InvoiceNotificationCodeConstant.INVOICE_ISSUED_BODY,
        deepLink: `/invoices/${aggregateId}`,
        data: {
          messageKey: 'invoice.issued',
          invoiceId: aggregateId,
          contractId,
          period,
        },
      },
    };
  }
}
