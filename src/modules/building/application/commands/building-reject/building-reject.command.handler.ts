import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { OutboxMessage } from 'modules/outbox/domain/entities/outbox-message.entity';
import { OutboxRepository } from 'modules/outbox/domain/repositories/outbox.repository';
import { OUTBOX_DI_TOKEN } from 'modules/outbox/outbox.di-token';
import { UNIT_OF_WORK_DI_TOKEN } from 'shared/application/di-tokens';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { BUILDING_DI_TOKEN } from '../../../building.di-token';
import { BuildingEntity } from '../../../domain/entities/building.entity';
import { BuildingNotificationRequestedEvent } from '../../../domain/events/building-notification-requested.event';
import { BuildingNotFoundException } from '../../../domain/exceptions/building-not-found.exception';
import { BuildingRepository } from '../../../domain/repositories/building.repository';
import { BuildingRejectCommand } from './building-reject.command';

@CommandHandler(BuildingRejectCommand)
export class BuildingRejectCommandHandler implements ICommandHandler<
  BuildingRejectCommand,
  BuildingEntity
> {
  constructor(
    @Inject(BUILDING_DI_TOKEN.REPOSITORY)
    private readonly buildingRepository: BuildingRepository,
    @Inject(UNIT_OF_WORK_DI_TOKEN)
    private readonly unitOfWork: IUnitOfWork,
    @Inject(OUTBOX_DI_TOKEN.REPOSITORY)
    private readonly outboxRepository: OutboxRepository,
  ) {}

  async execute(command: BuildingRejectCommand): Promise<BuildingEntity> {
    return this.unitOfWork.run(async (context) => {
      const building = await this.buildingRepository.findByIdForUpdate(
        command.buildingId,
        context,
      );
      if (!building) throw new BuildingNotFoundException(command.buildingId);

      building.reject(command.adminId, command.note);
      const events = building.pullDomainEvents();
      if (building.landlordId !== command.adminId) {
        events.push(
          new BuildingNotificationRequestedEvent(
            building.id,
            'building.rejected',
            building.name,
            building.note,
            [building.landlordId],
            building.reviewedAt!,
          ),
        );
      }
      await this.buildingRepository.save(building, context);
      await this.outboxRepository.append(
        events.map((event) => OutboxMessage.fromDomainEvent(event)),
        context,
      );
      return building;
    });
  }
}
