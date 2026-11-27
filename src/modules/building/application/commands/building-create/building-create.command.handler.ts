import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { OutboxMessage } from 'modules/outbox/domain/entities/outbox-message.entity';
import { OutboxRepository } from 'modules/outbox/domain/repositories/outbox.repository';
import { OUTBOX_DI_TOKEN } from 'modules/outbox/outbox.di-token';
import { UNIT_OF_WORK_DI_TOKEN } from 'shared/application/di-tokens';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { BUILDING_DI_TOKEN } from '../../../building.di-token';
import { BuildingEntity } from '../../../domain/entities/building.entity';
import { BuildingRepository } from '../../../domain/repositories/building.repository';
import { BuildingPendingReviewNotificationRequestedEvent } from '../../../domain/events/building-pending-review-notification-requested.event';
import { IGeocodingPort } from '../../ports/geocoding.port';
import { BuildingNotificationRecipientReader } from '../../ports/building-notification-recipient-reader.port';
import { BuildingCreateCommand } from './building-create.command';

@CommandHandler(BuildingCreateCommand)
export class BuildingCreateCommandHandler implements ICommandHandler<
  BuildingCreateCommand,
  BuildingEntity
> {
  constructor(
    @Inject(BUILDING_DI_TOKEN.REPOSITORY)
    private readonly buildingRepository: BuildingRepository,
    @Inject(BUILDING_DI_TOKEN.GEOCODING)
    private readonly geocoding: IGeocodingPort,
    @Inject(UNIT_OF_WORK_DI_TOKEN)
    private readonly unitOfWork: IUnitOfWork,
    @Inject(OUTBOX_DI_TOKEN.REPOSITORY)
    private readonly outboxRepository: OutboxRepository,
    @Inject(BUILDING_DI_TOKEN.NOTIFICATION_RECIPIENT_READER)
    private readonly notificationRecipients: BuildingNotificationRecipientReader,
  ) {}

  async execute(command: BuildingCreateCommand): Promise<BuildingEntity> {
    const { latitude, longitude } = await this.geocoding.geocode({
      address: command.address,
      ward: command.ward,
      province: command.province,
    });

    const recipients = await this.notificationRecipients.findForLandlord(
      command.landlordId,
    );

    return this.unitOfWork.run(async (context) => {
      const building = BuildingEntity.create({
        landlordId: command.landlordId,
        name: command.name,
        province: command.province,
        ward: command.ward,
        address: command.address,
        latitude,
        longitude,
      });

      await this.buildingRepository.save(building, context);
      const events = building.pullDomainEvents();
      if (recipients) {
        events.push(
          new BuildingPendingReviewNotificationRequestedEvent(
            building.id,
            building.name,
            recipients.landlordName,
            recipients.adminIds,
          ),
        );
      }
      await this.outboxRepository.append(
        events.map((event) => OutboxMessage.fromDomainEvent(event)),
        context,
      );
      return building;
    });
  }
}
