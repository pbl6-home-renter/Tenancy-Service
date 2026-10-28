import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { OutboxMessage } from 'modules/outbox/domain/entities/outbox-message.entity';
import { OutboxRepository } from 'modules/outbox/domain/repositories/outbox.repository';
import { OUTBOX_DI_TOKEN } from 'modules/outbox/outbox.di-token';
import { UNIT_OF_WORK_DI_TOKEN } from 'shared/application/di-tokens';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { BUILDING_DI_TOKEN } from '../../../building.di-token';
import { BuildingNotFoundException } from '../../../domain/exceptions/building-not-found.exception';
import { BuildingNotOwnedException } from '../../../domain/exceptions/building-not-owned.exception';
import { BuildingRepository } from '../../../domain/repositories/building.repository';
import { BuildingDeleteCommand } from './building-delete.command';

@CommandHandler(BuildingDeleteCommand)
export class BuildingDeleteCommandHandler implements ICommandHandler<
  BuildingDeleteCommand,
  void
> {
  constructor(
    @Inject(BUILDING_DI_TOKEN.REPOSITORY)
    private readonly buildingRepository: BuildingRepository,
    @Inject(UNIT_OF_WORK_DI_TOKEN)
    private readonly unitOfWork: IUnitOfWork,
    @Inject(OUTBOX_DI_TOKEN.REPOSITORY)
    private readonly outboxRepository: OutboxRepository,
  ) {}

  async execute(command: BuildingDeleteCommand): Promise<void> {
    await this.unitOfWork.run(async (context) => {
      const building = await this.buildingRepository.findByIdForUpdate(
        command.buildingId,
        context,
      );
      if (!building) {
        throw new BuildingNotFoundException(command.buildingId);
      }
      if (building.landlordId !== command.landlordId) {
        throw new BuildingNotOwnedException(
          command.buildingId,
          command.landlordId,
        );
      }

      building.delete();
      await this.buildingRepository.save(building, context);
      await this.outboxRepository.append(
        building
          .pullDomainEvents()
          .map((event) => OutboxMessage.fromDomainEvent(event)),
        context,
      );
    });
  }
}
