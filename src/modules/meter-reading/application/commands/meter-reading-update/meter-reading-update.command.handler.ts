import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { OUTBOX_DI_TOKEN } from 'modules/outbox/outbox.di-token';
import {
  MEDIA_LOOKUP_PORT,
  MediaLookupPort,
} from 'modules/media/application/ports/media-lookup.port';
import { OutboxMessage } from 'modules/outbox/domain/entities/outbox-message.entity';
import { OutboxRepository } from 'modules/outbox/domain/repositories/outbox.repository';
import { ROOM_DI_TOKEN } from 'modules/room/room.di-token';
import { RoomNotFoundException } from 'modules/room/domain/exceptions/room-not-found.exception';
import { RoomNotOwnedException } from 'modules/room/domain/exceptions/room-not-owned.exception';
import { RoomRepository } from 'modules/room/domain/repositories/room.repository';
import { UNIT_OF_WORK_DI_TOKEN } from 'shared/application/di-tokens';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { METER_READING_DI_TOKEN } from '../../../meter-reading.di-token';
import { MeterReadingEntity } from '../../../domain/entities/meter-reading.entity';
import { MeterReadingNotFoundException } from '../../../domain/exceptions/meter-reading-not-found.exception';
import { MeterReadingNotLatestException } from '../../../domain/exceptions/meter-reading-not-latest.exception';
import { PeriodAlreadyInvoicedException } from '../../../domain/exceptions/period-already-invoiced.exception';
import { MeterReadingRepository } from '../../../domain/repositories/meter-reading.repository';
import { MeterReadingUpdateCommand } from './meter-reading-update.command';

@CommandHandler(MeterReadingUpdateCommand)
export class MeterReadingUpdateCommandHandler implements ICommandHandler<
  MeterReadingUpdateCommand,
  MeterReadingEntity
> {
  constructor(
    @Inject(METER_READING_DI_TOKEN.REPOSITORY)
    private readonly readings: MeterReadingRepository,
    @Inject(ROOM_DI_TOKEN.REPOSITORY)
    private readonly rooms: RoomRepository,
    @Inject(OUTBOX_DI_TOKEN.REPOSITORY)
    private readonly outbox: OutboxRepository,
    @Inject(UNIT_OF_WORK_DI_TOKEN)
    private readonly unitOfWork: IUnitOfWork,
    @Inject(MEDIA_LOOKUP_PORT)
    private readonly media: MediaLookupPort,
  ) {}

  execute(command: MeterReadingUpdateCommand): Promise<MeterReadingEntity> {
    return this.unitOfWork.run(async (context) => {
      const initial = await this.readings.findById(command.readingId, context);
      if (!initial) throw new MeterReadingNotFoundException();
      const room = await this.rooms.findByIdForUpdate(initial.roomId, context);
      if (!room) throw new RoomNotFoundException(initial.roomId);
      if (room.landlordId !== command.landlordId)
        throw new RoomNotOwnedException(room.id, command.landlordId);

      const reading = await this.readings.findById(command.readingId, context);
      if (!reading) throw new MeterReadingNotFoundException();
      if (
        await this.readings.hasIssuedInvoice(
          room.id,
          reading.period.value,
          context,
        )
      )
        throw new PeriodAlreadyInvoicedException();
      const latest = await this.readings.findLatest(
        room.id,
        reading.type,
        context,
      );
      if (latest?.id !== reading.id) throw new MeterReadingNotLatestException();

      if (command.evidenceMediaIds !== undefined) {
        const media = await this.media.findMediaByIds([
          ...command.evidenceMediaIds,
        ]);
        const validIds = new Set(
          media
            .filter(
              (item) =>
                item.ownerType === 'meter_reading' &&
                item.ownerId === reading.id &&
                item.purpose === 'meter_reading_evidence' &&
                item.status === 'uploaded',
            )
            .map((item) => item.id),
        );
        if (validIds.size !== new Set(command.evidenceMediaIds).size)
          throw new ValidationException(
            'Evidence media must belong to this meter reading',
          );
      }
      reading.update(command.currentReading, command.evidenceMediaIds);
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
