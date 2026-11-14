import { DomainEvent } from 'shared/domain/base/domain-event';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import {
  CONTRACT_NOTIFICATION_EVENTS,
  LANDLORD_LOCK_CYCLE_AGGREGATE_TYPE,
} from '../constants/contract-event.constants';
import type { LandlordLockCycleEntity } from '../entities/landlord-lock-cycle.entity';

export class ContractSuspensionNotificationRequestedEvent implements DomainEvent {
  readonly eventType = CONTRACT_NOTIFICATION_EVENTS.REQUESTED;
  readonly routingKey = CONTRACT_NOTIFICATION_EVENTS.REQUESTED;
  readonly aggregateType = LANDLORD_LOCK_CYCLE_AGGREGATE_TYPE;
  readonly occurredAt = new Date();

  constructor(
    private readonly cycle: LandlordLockCycleEntity,
    private readonly recipientUserIds: Uuid[],
    private readonly contractIds: Uuid[],
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
        title: 'Hợp đồng tạm ngưng',
        body: 'Hợp đồng đã tạm ngưng do tài khoản chủ trọ bị khóa.',
        data: {
          landlordId: this.cycle.landlordId,
          lockCycleId: this.cycle.id,
          contractIds: this.contractIds,
          graceDeadline: this.cycle.graceDeadline.toISOString(),
        },
      },
    };
  }
}
