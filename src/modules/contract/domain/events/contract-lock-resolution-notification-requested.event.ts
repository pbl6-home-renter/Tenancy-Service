import { DomainEvent } from 'shared/domain/base/domain-event';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import {
  CONTRACT_NOTIFICATION_EVENTS,
  LANDLORD_LOCK_CYCLE_AGGREGATE_TYPE,
} from '../constants/contract-event.constants';
import { ContractNotificationCodeConstant } from '../constants/contract-notification-code.constant';
import type { LandlordLockCycleEntity } from '../entities/landlord-lock-cycle.entity';

export class ContractLockResolutionNotificationRequestedEvent implements DomainEvent {
  readonly eventType = CONTRACT_NOTIFICATION_EVENTS.REQUESTED;
  readonly routingKey = CONTRACT_NOTIFICATION_EVENTS.REQUESTED;
  readonly aggregateType = LANDLORD_LOCK_CYCLE_AGGREGATE_TYPE;
  readonly occurredAt = new Date();

  constructor(
    private readonly cycle: LandlordLockCycleEntity,
    private readonly recipientUserId: Uuid,
    private readonly contractIds: Uuid[],
    private readonly action: 'decision_required' | 'restore' | 'terminate',
  ) {}

  get aggregateId(): Uuid {
    return this.cycle.id;
  }

  get payload(): Record<string, unknown> {
    const codes = {
      decision_required: [
        ContractNotificationCodeConstant.CONTRACT_LOCK_DECISION_REQUIRED_TITLE,
        ContractNotificationCodeConstant.CONTRACT_LOCK_DECISION_REQUIRED_BODY,
      ],
      restore: [
        ContractNotificationCodeConstant.CONTRACT_RESTORED_TITLE,
        ContractNotificationCodeConstant.CONTRACT_RESTORED_BODY,
      ],
      terminate: [
        ContractNotificationCodeConstant.CONTRACT_TERMINATED_TITLE,
        ContractNotificationCodeConstant.CONTRACT_TERMINATED_BODY,
      ],
    };
    const [title, body] = codes[this.action];
    return {
      sourceService: 'tenancy',
      recipientUserIds: [this.recipientUserId],
      notification: {
        type: 'system',
        title,
        body,
        data: {
          landlordId: this.cycle.landlordId,
          lockCycleId: this.cycle.id,
          contractIds: this.contractIds,
          graceDeadline: this.cycle.graceDeadline.toISOString(),
          action: this.action,
        },
      },
    };
  }
}
