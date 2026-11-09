import { Inject, Injectable } from '@nestjs/common';
import { OUTBOX_DI_TOKEN } from 'modules/outbox/outbox.di-token';
import { OutboxMessage } from 'modules/outbox/domain/entities/outbox-message.entity';
import { OutboxRepository } from 'modules/outbox/domain/repositories/outbox.repository';
import { ROOM_DI_TOKEN } from 'modules/room/room.di-token';
import { RoomNotFoundException } from 'modules/room/domain/exceptions/room-not-found.exception';
import { RoomNotOwnedException } from 'modules/room/domain/exceptions/room-not-owned.exception';
import { RoomRepository } from 'modules/room/domain/repositories/room.repository';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { MeterReadingEntity } from '../../domain/entities/meter-reading.entity';
import { MeterType } from '../../domain/enums/meter-type.enum';
import { BaselineRequiredException } from '../../domain/exceptions/baseline-required.exception';
import { DuplicateBulkMeterReadingException } from '../../domain/exceptions/duplicate-bulk-meter-reading.exception';
import { DuplicateMeterReadingException } from '../../domain/exceptions/duplicate-meter-reading.exception';
import { MeterReadingPeriodOutOfOrderException } from '../../domain/exceptions/meter-reading-period-out-of-order.exception';
import { MeterReadingRepository } from '../../domain/repositories/meter-reading.repository';
import { MeterValue } from '../../domain/value-objects/meter-value.vo';
import { ReadingPeriod } from '../../domain/value-objects/reading-period.vo';
import { METER_READING_DI_TOKEN } from '../../meter-reading.di-token';

export interface MeterReadingRecordInput {
  landlordId: Uuid;
  roomId: Uuid;
  type: MeterType;
  period: ReadingPeriod;
  currentReading: MeterValue;
  isBaseline: boolean;
  previousReading: MeterValue | null;
  buildingId?: Uuid;
}

export interface BulkMeterReadingRecordInput {
  landlordId: Uuid;
  buildingId: Uuid;
  period: ReadingPeriod;
  readings: ReadonlyMap<
    string,
    {
      roomId: Uuid;
      type: MeterType;
      currentReading: MeterValue;
      evidenceMediaIds?: Uuid[];
    }
  >;
}

export interface RecordedBulkMeterReading {
  roomId: Uuid;
  roomName: string;
  reading: MeterReadingEntity;
}

@Injectable()
export class MeterReadingRecorder {
  constructor(
    @Inject(ROOM_DI_TOKEN.REPOSITORY) private readonly rooms: RoomRepository,
    @Inject(METER_READING_DI_TOKEN.REPOSITORY)
    private readonly readings: MeterReadingRepository,
    @Inject(OUTBOX_DI_TOKEN.REPOSITORY)
    private readonly outbox: OutboxRepository,
  ) {}

  async record(
    input: MeterReadingRecordInput,
    context: TransactionContext,
  ): Promise<MeterReadingEntity> {
    // Locking the room also serializes simultaneous electricity and water writes.
    const room = await this.rooms.findByIdForUpdate(input.roomId, context);
    if (!room) throw new RoomNotFoundException(input.roomId);
    if (room.landlordId !== input.landlordId) {
      throw new RoomNotOwnedException(input.roomId, input.landlordId);
    }
    if (input.buildingId && room.buildingId !== input.buildingId) {
      throw new ValidationException('Room does not belong to the building');
    }
    if (
      await this.readings.existsFor(
        input.roomId,
        input.type,
        input.period.value,
        input.isBaseline,
        context,
      )
    ) {
      throw new DuplicateMeterReadingException();
    }
    const latest = await this.readings.findLatest(
      input.roomId,
      input.type,
      context,
    );
    const samePeriodBaseline =
      latest?.isBaseline && latest.period.value === input.period.value;
    if (
      latest &&
      !input.period.isAfter(latest.period) &&
      !(samePeriodBaseline && !input.isBaseline)
    ) {
      throw new MeterReadingPeriodOutOfOrderException();
    }
    if (!latest && !input.isBaseline) {
      throw new BaselineRequiredException();
    }

    let previousReading: MeterValue;
    if (input.isBaseline) {
      if (latest && input.previousReading === null) {
        throw new ValidationException(
          'A later baseline requires previousReading',
        );
      }
      previousReading = input.previousReading ?? MeterValue.create('0');
    } else {
      if (input.previousReading !== null) {
        throw new ValidationException(
          'A regular reading cannot specify previousReading',
        );
      }
      previousReading = latest!.currentReading;
    }

    const reading = MeterReadingEntity.record({
      landlordId: input.landlordId,
      buildingId: room.buildingId,
      roomId: room.id,
      type: input.type,
      period: input.period,
      previousReading,
      currentReading: input.currentReading,
      isBaseline: input.isBaseline,
      evidenceMediaIds: [],
    });
    await this.readings.save(reading, context);
    await this.outbox.append(
      reading
        .pullDomainEvents()
        .map((event) => OutboxMessage.fromDomainEvent(event)),
      context,
    );
    return reading;
  }

  async recordBulk(
    input: BulkMeterReadingRecordInput,
    context: TransactionContext,
  ): Promise<RecordedBulkMeterReading[]> {
    const items = [...input.readings.values()].sort(
      (left, right) =>
        left.roomId.localeCompare(right.roomId) ||
        left.type.localeCompare(right.type),
    );
    const roomIds = [
      ...new Map(
        items.map((item) => [item.roomId.toLowerCase(), item.roomId]),
      ).values(),
    ];
    const rooms = await this.rooms.findManyByIdsForUpdate(roomIds, context);
    const roomsById = new Map(
      rooms.map((room) => [room.id.toLowerCase(), room]),
    );

    for (const roomId of roomIds) {
      const room = roomsById.get(roomId.toLowerCase());
      if (!room) throw new RoomNotFoundException(roomId);
      if (room.landlordId !== input.landlordId) {
        throw new RoomNotOwnedException(roomId, input.landlordId);
      }
      if (room.buildingId !== input.buildingId) {
        throw new ValidationException('Room does not belong to the building');
      }
    }

    const latest = await this.readings.findLatestForRooms(roomIds, context);
    const latestByPair = new Map(
      latest.map((reading) => [
        `${reading.roomId.toLowerCase()}:${reading.type}`,
        reading,
      ]),
    );
    const recorded: RecordedBulkMeterReading[] = [];

    for (const item of items) {
      const room = roomsById.get(item.roomId.toLowerCase())!;
      const previous = latestByPair.get(
        `${item.roomId.toLowerCase()}:${item.type}`,
      );
      if (!previous) {
        throw new BaselineRequiredException();
      }
      const samePeriodBaseline =
        previous.isBaseline && input.period.value === previous.period.value;
      if (!input.period.isAfter(previous.period) && !samePeriodBaseline) {
        if (input.period.value === previous.period.value) {
          throw new DuplicateBulkMeterReadingException();
        }
        throw new ValidationException('Reading period is out of order');
      }

      recorded.push({
        roomId: room.id,
        roomName: room.name,
        reading: MeterReadingEntity.record({
          landlordId: input.landlordId,
          buildingId: room.buildingId,
          roomId: room.id,
          type: item.type,
          period: input.period,
          previousReading: previous.currentReading,
          currentReading: item.currentReading,
          isBaseline: false,
          evidenceMediaIds: item.evidenceMediaIds ?? [],
        }),
      });
    }

    await this.readings.insertMany(
      recorded.map(({ reading }) => reading),
      context,
    );
    await this.outbox.append(
      recorded.flatMap(({ reading }) =>
        reading
          .pullDomainEvents()
          .map((event) => OutboxMessage.fromDomainEvent(event)),
      ),
      context,
    );
    return recorded;
  }
}
