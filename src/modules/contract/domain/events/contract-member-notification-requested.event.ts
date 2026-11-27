import { DomainEvent } from 'shared/domain/base/domain-event';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { CONTRACT_NOTIFICATION_EVENTS } from '../constants/contract-event.constants';
import { CONTRACT_MEMBER_AGGREGATE_TYPE } from '../constants/contract-member-event.constants';
import { ContractNotificationCodeConstant } from '../constants/contract-notification-code.constant';

type MemberNotification =
  | {
      messageKey: 'contract.member_added';
      contractId: Uuid;
      contractCode: string;
      roomName: string | null;
      buildingName: string | null;
    }
  | {
      messageKey: 'contract.member_linked';
      contractId: Uuid;
      contractCode: string;
      memberName: string | null;
    }
  | {
      messageKey: 'contract.member_left';
      contractId: Uuid;
      contractCode: string;
      memberName: string | null;
      leftOn: string;
    };

export class ContractMemberNotificationRequestedEvent implements DomainEvent {
  readonly eventType = CONTRACT_NOTIFICATION_EVENTS.REQUESTED;
  readonly routingKey = CONTRACT_NOTIFICATION_EVENTS.REQUESTED;
  readonly aggregateType = CONTRACT_MEMBER_AGGREGATE_TYPE;
  readonly occurredAt = new Date();

  constructor(
    readonly aggregateId: Uuid,
    private readonly recipientUserIds: Uuid[],
    private readonly data: MemberNotification,
  ) {}

  get payload(): Record<string, unknown> {
    const codes = {
      'contract.member_added': [
        ContractNotificationCodeConstant.CONTRACT_MEMBER_ADDED_TITLE,
        ContractNotificationCodeConstant.CONTRACT_MEMBER_ADDED_BODY,
      ],
      'contract.member_linked': [
        ContractNotificationCodeConstant.CONTRACT_MEMBER_LINKED_TITLE,
        ContractNotificationCodeConstant.CONTRACT_MEMBER_LINKED_BODY,
      ],
      'contract.member_left': [
        ContractNotificationCodeConstant.CONTRACT_MEMBER_LEFT_TITLE,
        ContractNotificationCodeConstant.CONTRACT_MEMBER_LEFT_BODY,
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
