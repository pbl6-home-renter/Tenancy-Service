import { DomainEvent } from 'shared/domain/base/domain-event';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import {
  CONTRACT_NOTIFICATION_EVENTS,
  LANDLORD_LOCK_CYCLE_AGGREGATE_TYPE,
} from '../constants/contract-event.constants';
import { ContractNotificationCodeConstant } from '../constants/contract-notification-code.constant';
import type { LandlordLockCycleEntity } from '../entities/landlord-lock-cycle.entity';
import { ContractNotificationSnapshot } from './contract-notification-snapshot';

export class ContractSuspensionNotificationRequestedEvent implements DomainEvent {
  readonly eventType = CONTRACT_NOTIFICATION_EVENTS.REQUESTED;
  readonly routingKey = CONTRACT_NOTIFICATION_EVENTS.REQUESTED;
  readonly aggregateType = LANDLORD_LOCK_CYCLE_AGGREGATE_TYPE;
  readonly occurredAt = new Date();

  constructor(
    private readonly cycle: LandlordLockCycleEntity,
    private readonly recipientUserIds: Uuid[],
    private readonly contracts: ContractNotificationSnapshot[],
  ) {}

  get aggregateId(): Uuid {
    return this.cycle.id;
  }

  get payload(): Record<string, unknown> {
    return {
      sourceService: 'tenancy',
      recipientUserIds: this.recipientUserIds,
      notification: {
        type: 'system',
        title: ContractNotificationCodeConstant.CONTRACT_SUSPENDED_TITLE,
        body: ContractNotificationCodeConstant.CONTRACT_SUSPENDED_BODY,
        data: {
          messageKey: 'contract.suspended',
          landlordId: this.cycle.landlordId,
          lockCycleId: this.cycle.id,
          contractIds: this.contracts.map((contract) => contract.contractId),
          contracts: this.contracts,
          graceDeadline: this.cycle.graceDeadline.toISOString(),
        },
      },
    };
  }
}
