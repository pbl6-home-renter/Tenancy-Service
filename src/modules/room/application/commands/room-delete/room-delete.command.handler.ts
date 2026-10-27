import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UNIT_OF_WORK_DI_TOKEN } from 'shared/application/di-tokens';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { OUTBOX_DI_TOKEN } from 'modules/outbox/outbox.di-token';
import { OutboxMessage } from 'modules/outbox/domain/entities/outbox-message.entity';
import { OutboxRepository } from 'modules/outbox/domain/repositories/outbox.repository';
import { RoomNotOwnedException } from '../../../domain/exceptions/room-not-owned.exception';
import { ROOM_DI_TOKEN } from '../../../room.di-token';
import { RoomNotFoundException } from '../../../domain/exceptions/room-not-found.exception';
import { RoomRepository } from '../../../domain/repositories/room.repository';
import { RoomDeleteCommand } from './room-delete.command';

@CommandHandler(RoomDeleteCommand)
export class RoomDeleteCommandHandler implements ICommandHandler<
  RoomDeleteCommand,
  void
> {
  constructor(
    @Inject(ROOM_DI_TOKEN.REPOSITORY)
    private readonly roomRepository: RoomRepository,
    @Inject(UNIT_OF_WORK_DI_TOKEN)
    private readonly unitOfWork: IUnitOfWork,
    @Inject(OUTBOX_DI_TOKEN.REPOSITORY)
    private readonly outboxRepository: OutboxRepository,
  ) {}

  async execute(command: RoomDeleteCommand): Promise<void> {
    await this.unitOfWork.run(async (context) => {
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

      // TODO: Check for active contracts when the Contract domain is available.
      room.delete();
      await this.roomRepository.save(room, context);
      await this.outboxRepository.append(
        room
          .pullDomainEvents()
          .map((event) => OutboxMessage.fromDomainEvent(event)),
        context,
      );
    });
  }
}
