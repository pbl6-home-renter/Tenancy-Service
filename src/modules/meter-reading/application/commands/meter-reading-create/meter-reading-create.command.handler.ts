import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { OUTBOX_DI_TOKEN } from 'modules/outbox/outbox.di-token';
import { OutboxMessage } from 'modules/outbox/domain/entities/outbox-message.entity';
import { OutboxRepository } from 'modules/outbox/domain/repositories/outbox.repository';
import { ROOM_DI_TOKEN } from 'modules/room/room.di-token';
import { RoomNotFoundException } from 'modules/room/domain/exceptions/room-not-found.exception';
import { RoomNotOwnedException } from 'modules/room/domain/exceptions/room-not-owned.exception';
import { RoomRepository } from 'modules/room/domain/repositories/room.repository';
import { UNIT_OF_WORK_DI_TOKEN } from 'shared/application/di-tokens';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { MeterReadingEntity } from '../../../domain/entities/meter-reading.entity';
import { BaselineRequiredException } from '../../../domain/exceptions/baseline-required.exception';
import { DuplicateMeterReadingException } from '../../../domain/exceptions/duplicate-meter-reading.exception';
import { MeterReadingPeriodOutOfOrderException } from '../../../domain/exceptions/meter-reading-period-out-of-order.exception';
import { MeterReadingRepository } from '../../../domain/repositories/meter-reading.repository';
import { METER_READING_DI_TOKEN } from '../../../meter-reading.di-token';
import { MeterReadingCreateCommand } from './meter-reading-create.command';

@CommandHandler(MeterReadingCreateCommand)
export class MeterReadingCreateCommandHandler implements ICommandHandler<
  MeterReadingCreateCommand,
  MeterReadingEntity
> {
  constructor(
    @Inject(ROOM_DI_TOKEN.REPOSITORY) private readonly rooms: RoomRepository,
    @Inject(METER_READING_DI_TOKEN.REPOSITORY)
    private readonly readings: MeterReadingRepository,
    @Inject(UNIT_OF_WORK_DI_TOKEN) private readonly unitOfWork: IUnitOfWork,
    @Inject(OUTBOX_DI_TOKEN.REPOSITORY)
    private readonly outbox: OutboxRepository,
  ) {}

  async execute(
    command: MeterReadingCreateCommand,
  ): Promise<MeterReadingEntity> {
    return this.unitOfWork.run(async (context) => {
      // Lock Room to serialize writes for the same room across all meter types.
      const room = await this.rooms.findByIdForUpdate(command.roomId, context);
      if (!room) throw new RoomNotFoundException(command.roomId);
      if (room.landlordId !== command.landlordId) {
        throw new RoomNotOwnedException(command.roomId, command.landlordId);
      }
      if (
        await this.readings.existsFor(
          command.roomId,
          command.type,
          command.period.value,
          context,
        )
      ) {
        throw new DuplicateMeterReadingException();
      }
      const latest = await this.readings.findLatest(
        command.roomId,
        command.type,
        context,
      );
      if (latest && !command.period.isAfter(latest.period)) {
        throw new MeterReadingPeriodOutOfOrderException();
      }
      if (!latest && !command.isBaseline) {
        throw new BaselineRequiredException();
      }
      // A baseline starts a new meter's sequence; it has no consumption itself.
      const previousReading = command.isBaseline
        ? command.currentReading
        : latest!.currentReading;
      const reading = MeterReadingEntity.record({
        landlordId: command.landlordId,
        buildingId: room.buildingId,
        roomId: room.id,
        type: command.type,
        period: command.period,
        previousReading,
        currentReading: command.currentReading,
        isBaseline: command.isBaseline,
        evidenceMediaId: command.evidenceMediaId,
      });
      await this.readings.save(reading, context);
      await this.outbox.append(
        reading
          .pullDomainEvents()
          .map((event) => OutboxMessage.fromDomainEvent(event)),
        context,
      );
      return reading;
    });
  }
}
