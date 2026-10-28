import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { OutboxMessage } from 'modules/outbox/domain/entities/outbox-message.entity';
import { OutboxRepository } from 'modules/outbox/domain/repositories/outbox.repository';
import { OUTBOX_DI_TOKEN } from 'modules/outbox/outbox.di-token';
import { UNIT_OF_WORK_DI_TOKEN } from 'shared/application/di-tokens';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { BUILDING_DI_TOKEN } from '../../../building.di-token';
import { BuildingEntity } from '../../../domain/entities/building.entity';
import { BuildingStatus } from '../../../domain/enums/building-status.enum';
import { ApprovedBuildingLockedException } from '../../../domain/exceptions/approved-building-locked.exception';
import { BuildingNotFoundException } from '../../../domain/exceptions/building-not-found.exception';
import { BuildingNotOwnedException } from '../../../domain/exceptions/building-not-owned.exception';
import { BuildingRepository } from '../../../domain/repositories/building.repository';
import { GeocodedCoordinate, IGeocodingPort } from '../../ports/geocoding.port';
import { BuildingUpdateCommand } from './building-update.command';

@CommandHandler(BuildingUpdateCommand)
export class BuildingUpdateCommandHandler implements ICommandHandler<
  BuildingUpdateCommand,
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
  ) {}

  async execute(command: BuildingUpdateCommand): Promise<BuildingEntity> {
    return this.unitOfWork.run(async (context) => {
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
      if (building.status === BuildingStatus.APPROVED) {
        throw new ApprovedBuildingLockedException(command.buildingId);
      }

      let coordinates: GeocodedCoordinate | undefined;
      if (command.address !== undefined) {
        coordinates = await this.geocoding.geocode({
          address: command.address,
          ward: building.ward,
          province: building.province,
        });
      }

      building.update({
        name: command.name,
        address: command.address,
        ...coordinates,
      });
      await this.buildingRepository.save(building, context);
      await this.outboxRepository.append(
        building
          .pullDomainEvents()
          .map((event) => OutboxMessage.fromDomainEvent(event)),
        context,
      );
      return building;
    });
  }
}
