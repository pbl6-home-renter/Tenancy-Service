import { DomainEvent } from 'shared/domain/base/domain-event';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { BUILDING_AGGREGATE_TYPE } from '../constants/building-event.constants';
import { BuildingStatus } from '../enums/building-status.enum';

export class BuildingReviewNotificationRequestedEvent implements DomainEvent {
  readonly eventType = 'notification.requested';
  readonly routingKey = 'notification.requested';
  readonly aggregateType = BUILDING_AGGREGATE_TYPE;
  readonly occurredAt = new Date();

  constructor(
    readonly aggregateId: Uuid,
    private readonly landlordId: Uuid,
    private readonly buildingName: string,
    private readonly decision:
      BuildingStatus.APPROVED | BuildingStatus.REJECTED,
    private readonly rejectionNote: string | null,
  ) {}

  get payload(): Record<string, unknown> {
    const approved = this.decision === BuildingStatus.APPROVED;
    return {
      sourceService: 'tenancy-service',
      recipientUserIds: [this.landlordId],
      notification: {
        type: 'system',
        title: approved ? 'Tòa nhà đã được duyệt' : 'Tòa nhà bị từ chối',
        body: approved
          ? `Tòa nhà "${this.buildingName}" đã được duyệt.`
          : `Tòa nhà "${this.buildingName}" bị từ chối. Lý do: ${this.rejectionNote}`,
        deepLink: `/buildings/${this.aggregateId}`,
        data: {
          buildingId: this.aggregateId,
          decision: this.decision,
        },
      },
    };
  }
}
