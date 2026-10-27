import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UNIT_OF_WORK_DI_TOKEN } from 'shared/application/di-tokens';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { RoomNotOwnedException } from '../../../domain/exceptions/room-not-owned.exception';
import { RoomNotFoundException } from '../../../domain/exceptions/room-not-found.exception';
import { Room } from '../../../domain/entities/room.entity';
import { RoomRepository } from '../../../domain/repositories/room.repository';
import { ROOM_DI_TOKEN } from '../../../room.di-token';
import { OUTBOX_DI_TOKEN } from 'modules/outbox/outbox.di-token';
import { OutboxRepository } from 'modules/outbox/domain/repositories/outbox.repository';
import { OutboxMessage } from 'modules/outbox/domain/entities/outbox-message.entity';
import { RoomUpdateCommand } from './room-update.command';

@CommandHandler(RoomUpdateCommand)
export class RoomUpdateCommandHandler implements ICommandHandler<
  RoomUpdateCommand,
  Room
> {
  constructor(
    @Inject(ROOM_DI_TOKEN.REPOSITORY)
    private readonly roomRepository: RoomRepository,
    @Inject(UNIT_OF_WORK_DI_TOKEN)
    private readonly unitOfWork: IUnitOfWork,
    @Inject(OUTBOX_DI_TOKEN.REPOSITORY)
    private readonly outboxRepository: OutboxRepository,
  ) {}

  execute(command: RoomUpdateCommand): Promise<Room> {
    return this.unitOfWork.run(async (context) => {
      const room = await this.roomRepository.findByIdForUpdate(
        command.roomId,
        context,
      );
      if (!room) {
        throw new RoomNotFoundException(command.roomId);
      }
      if (room.landlordId !== command.landlordId) {
        throw new RoomNotOwnedException(command.roomId, command.landlordId);
      }

      room.update(command.updates);
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
