import { DomainEvent } from 'shared/domain/base/domain-event';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { BUILDING_AGGREGATE_TYPE } from '../constants/building-event.constants';
import { BuildingNotificationCodeConstant } from '../constants/building-notification-code.constant';

export class BuildingPendingReviewNotificationRequestedEvent implements DomainEvent {
  readonly eventType = 'notification.requested';
  readonly routingKey = 'notification.requested';
  readonly aggregateType = BUILDING_AGGREGATE_TYPE;
  readonly occurredAt = new Date();

  constructor(
    readonly aggregateId: Uuid,
    private readonly buildingName: string,
    private readonly landlordName: string,
    private readonly adminIds: Uuid[],
  ) {}

  get payload(): Record<string, unknown> {
    return {
      sourceService: 'tenancy-service',
      recipientUserIds: [...this.adminIds],
      notification: {
        type: 'system',
        title: BuildingNotificationCodeConstant.PENDING_REVIEW_TITLE,
        body: BuildingNotificationCodeConstant.PENDING_REVIEW_BODY,
        deepLink: `/admin/buildings/${this.aggregateId}`,
        data: {
          messageKey: 'building.pending_review',
          buildingId: this.aggregateId,
          buildingName: this.buildingName,
          landlordName: this.landlordName,
        },
      },
    };
  }
}
