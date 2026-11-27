import { DomainEvent } from 'shared/domain/base/domain-event';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import {
  CONTRACT_AGGREGATE_TYPE,
  CONTRACT_NOTIFICATION_EVENTS,
} from '../constants/contract-event.constants';
import { ContractNotificationCodeConstant } from '../constants/contract-notification-code.constant';

type LifecycleNotification = {
  contractId: Uuid;
  contractCode: string;
  roomName: string | null;
  buildingName: string | null;
} & (
  | { messageKey: 'contract.activated'; startDate: string }
  | { messageKey: 'contract.checked_out'; endDate: string }
);

export class ContractLifecycleNotificationRequestedEvent implements DomainEvent {
  readonly eventType = CONTRACT_NOTIFICATION_EVENTS.REQUESTED;
  readonly routingKey = CONTRACT_NOTIFICATION_EVENTS.REQUESTED;
  readonly aggregateType = CONTRACT_AGGREGATE_TYPE;
  readonly occurredAt = new Date();

  constructor(
    readonly aggregateId: Uuid,
    private readonly recipientUserIds: Uuid[],
    private readonly data: LifecycleNotification,
  ) {}

  get payload(): Record<string, unknown> {
    const codes = {
      'contract.activated': [
        ContractNotificationCodeConstant.CONTRACT_ACTIVATED_TITLE,
        ContractNotificationCodeConstant.CONTRACT_ACTIVATED_BODY,
      ],
      'contract.checked_out': [
        ContractNotificationCodeConstant.CONTRACT_CHECKED_OUT_TITLE,
        ContractNotificationCodeConstant.CONTRACT_CHECKED_OUT_BODY,
      ],
    };
    const [title, body] = codes[this.data.messageKey];
    return {
      sourceService: 'tenancy',
      recipientUserIds: this.recipientUserIds,
      notification: { type: 'system', title, body, data: this.data },
    };
  }
}
