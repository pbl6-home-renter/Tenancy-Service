import { DomainEvent } from 'shared/domain/base/domain-event';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { BUILDING_AGGREGATE_TYPE } from '../constants/building-event.constants';
import { BuildingNotificationCodeConstant } from '../constants/building-notification-code.constant';

export class BuildingNotificationRequestedEvent implements DomainEvent {
  readonly eventType = 'notification.requested';
  readonly routingKey = 'notification.requested';
  readonly aggregateType = BUILDING_AGGREGATE_TYPE;
  readonly payload: Record<string, unknown>;

  constructor(
    readonly aggregateId: Uuid,
    messageKey: 'building.approved' | 'building.rejected',
    buildingName: string,
    note: string | null,
    recipientUserIds: Uuid[],
    readonly occurredAt: Date,
  ) {
    const approved = messageKey === 'building.approved';
    this.payload = {
      sourceService: 'tenancy-service',
      recipientUserIds: [...recipientUserIds],
      notification: {
        type: 'system',
        title: approved
          ? BuildingNotificationCodeConstant.BUILDING_APPROVED_TITLE
          : BuildingNotificationCodeConstant.BUILDING_REJECTED_TITLE,
        body: approved
          ? BuildingNotificationCodeConstant.BUILDING_APPROVED_BODY
          : BuildingNotificationCodeConstant.BUILDING_REJECTED_BODY,
        deepLink: `/buildings/${aggregateId}`,
        data: {
          messageKey,
          buildingId: aggregateId,
          buildingName,
          note,
        },
      },
    };
  }
}
