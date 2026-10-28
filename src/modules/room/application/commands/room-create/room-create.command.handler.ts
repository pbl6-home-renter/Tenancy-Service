import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UNIT_OF_WORK_DI_TOKEN } from 'shared/application/di-tokens';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { OutboxMessage } from 'modules/outbox/domain/entities/outbox-message.entity';
import { OutboxRepository } from 'modules/outbox/domain/repositories/outbox.repository';
import { OUTBOX_DI_TOKEN } from 'modules/outbox/outbox.di-token';
import { BuildingStatus } from 'modules/building/domain/enums/building-status.enum';
import { BuildingNotApprovedException } from 'modules/building/domain/exceptions/building-not-approved.exception';
import { BuildingNotFoundException } from 'modules/building/domain/exceptions/building-not-found.exception';
import { BuildingNotOwnedException } from 'modules/building/domain/exceptions/building-not-owned.exception';
import { BUILDING_DI_TOKEN } from 'modules/building/building.di-token';
import { BuildingRepository } from 'modules/building/domain/repositories/building.repository';
import { Room } from '../../../domain/entities/room.entity';
import { DuplicateRoomException } from '../../../domain/exceptions/duplicate-room.exception';
import { RoomRepository } from '../../../domain/repositories/room.repository';
import { ROOM_DI_TOKEN } from '../../../room.di-token';
import { RoomCreateCommand } from './room-create.command';

@CommandHandler(RoomCreateCommand)
export class RoomCreateCommandHandler implements ICommandHandler<
  RoomCreateCommand,
  Room
> {
  constructor(
    @Inject(ROOM_DI_TOKEN.REPOSITORY)
    private readonly roomRepository: RoomRepository,
    @Inject(BUILDING_DI_TOKEN.REPOSITORY)
    private readonly buildingRepository: BuildingRepository,
    @Inject(UNIT_OF_WORK_DI_TOKEN)
    private readonly unitOfWork: IUnitOfWork,
    @Inject(OUTBOX_DI_TOKEN.REPOSITORY)
    private readonly outboxRepository: OutboxRepository,
  ) {}

  execute(command: RoomCreateCommand): Promise<Room> {
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
      if (building.status !== BuildingStatus.APPROVED) {
        throw new BuildingNotApprovedException(command.buildingId);
      }
      if (
        await this.roomRepository.existsByBuildingAndName(
          command.buildingId,
          command.name,
          undefined,
          context,
        )
      ) {
        throw new DuplicateRoomException(command.buildingId, command.name);
      }

      const room = Room.create({
        landlordId: command.landlordId,
        buildingId: command.buildingId,
        name: command.name,
        floorNumber: command.floorNumber,
        area: command.area,
        rentPrice: command.rentPrice,
        depositAmount: command.depositAmount,
        genderPolicy: command.genderPolicy,
        maxOccupancy: command.maxOccupancy,
        amenities: command.amenities,
      });

      await this.roomRepository.save(room, context);
      await this.outboxRepository.append(
        room
          .pullDomainEvents()
          .map((event) => OutboxMessage.fromDomainEvent(event)),
        context,
      );

      return room;
    });
  }
}
