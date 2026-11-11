import { MeterReadingRecorder } from 'modules/meter-reading/application/services/meter-reading-recorder.service';
import { MeterReadingEntity } from 'modules/meter-reading/domain/entities/meter-reading.entity';
import { MeterReadingRepository } from 'modules/meter-reading/domain/repositories/meter-reading.repository';
import { MeterType } from 'modules/meter-reading/domain/enums/meter-type.enum';
import { BaselineRequiredException } from 'modules/meter-reading/domain/exceptions/baseline-required.exception';
import { DuplicateMeterReadingException } from 'modules/meter-reading/domain/exceptions/duplicate-meter-reading.exception';
import { MeterValue } from 'modules/meter-reading/domain/value-objects/meter-value.vo';
import { ReadingPeriod } from 'modules/meter-reading/domain/value-objects/reading-period.vo';
import { Room } from 'modules/room/domain/entities/room.entity';
import { RoomRepository } from 'modules/room/domain/repositories/room.repository';
import { OutboxRepository } from 'modules/outbox/domain/repositories/outbox.repository';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';

function createRoom(landlordId: ReturnType<typeof generateUuid>): Room {
  return Room.create({
    landlordId,
    buildingId: generateUuid(),
    name: 'Room 101',
    rentPrice: 3_000_000,
    depositAmount: 0,
  });
}

function createRoomRepository(room: Room | null): RoomRepository {
  return {
    save: jest.fn(async () => undefined),
    findById: jest.fn(async () => room),
    delete: jest.fn(async () => undefined),
    findOwnedPaginated: jest.fn(async () => ({
      data: [],
      pagination: {
        type: 'offset' as const,
        pageNo: 1,
        pageSize: 10,
        totalItems: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    })),
    findByIdForUpdate: jest.fn(async () => room),
    findManyByIdsForUpdate: jest.fn(async () => (room ? [room] : [])),
    existsByBuildingAndName: jest.fn(async () => false),
  };
}

function createMeterRepository(
  options: {
    latest?: MeterReadingEntity | null;
    exists?: boolean;
  } = {},
): MeterReadingRepository {
  return {
    save: jest.fn(async () => undefined),
    findById: jest.fn(async () => null),
    delete: jest.fn(async () => undefined),
    findLatest: jest.fn(async () => options.latest ?? null),
    existsFor: jest.fn(async () => options.exists ?? false),
    findLatestForRooms: jest.fn(async () => []),
    insertMany: jest.fn(async () => undefined),
    hasIssuedInvoice: jest.fn(async () => false),
    findByRoomAndPeriod: jest.fn(async () => []),
  };
}

function createOutboxRepository(): OutboxRepository {
  return {
    append: jest.fn(async () => undefined),
    claimBatch: jest.fn(async () => []),
    saveClaimOutcome: jest.fn(async () => true),
    reclaimStale: jest.fn(async () => 0),
    requeueFailed: jest.fn(async () => true),
    purgePublished: jest.fn(async () => 0),
  };
}

describe('MeterReadingRecorder', () => {
  it('creates the first baseline from zero and appends its event in the same transaction', async () => {
    const landlordId = generateUuid();
    const room = createRoom(landlordId);
    const context: TransactionContext = { kind: 'transaction' };
    const readings = createMeterRepository();
    const outbox = createOutboxRepository();
    const recorder = new MeterReadingRecorder(
      createRoomRepository(room),
      readings,
      outbox,
    );

    const recorded = await recorder.record(
      {
        landlordId,
        roomId: room.id,
        type: MeterType.ELECTRICITY,
        period: ReadingPeriod.create('2026-10'),
        currentReading: MeterValue.create('100.5'),
        isBaseline: true,
        previousReading: null,
      },
      context,
    );

    expect(recorded.previousReading.value).toBe('0');
    expect(recorded.consumption).toBe('100.5');
    expect(readings.save).toHaveBeenCalledWith(recorded, context);
    expect(outbox.append).toHaveBeenCalledWith(
      [expect.objectContaining({ eventType: 'meter_reading.recorded' })],
      context,
    );
  });

  it('uses the latest reading as the previous value for a regular reading', async () => {
    const landlordId = generateUuid();
    const room = createRoom(landlordId);
    const latest = MeterReadingEntity.record({
      landlordId,
      buildingId: room.buildingId,
      roomId: room.id,
      type: MeterType.WATER,
      period: ReadingPeriod.create('2026-09'),
      previousReading: MeterValue.create('0'),
      currentReading: MeterValue.create('12.5'),
      isBaseline: true,
      evidenceMediaIds: [],
    });
    const readings = createMeterRepository({ latest });
    const recorder = new MeterReadingRecorder(
      createRoomRepository(room),
      readings,
      createOutboxRepository(),
    );

    const recorded = await recorder.record(
      {
        landlordId,
        roomId: room.id,
        type: MeterType.WATER,
        period: ReadingPeriod.create('2026-10'),
        currentReading: MeterValue.create('15'),
        isBaseline: false,
        previousReading: null,
      },
      { kind: 'transaction' },
    );

    expect(recorded.previousReading.value).toBe('12.5');
    expect(recorded.consumption).toBe('2.5');
  });

  it('requires a baseline and rejects duplicate readings before writing', async () => {
    const landlordId = generateUuid();
    const room = createRoom(landlordId);
    const readings = createMeterRepository();
    const recorder = new MeterReadingRecorder(
      createRoomRepository(room),
      readings,
      createOutboxRepository(),
    );
    const input = {
      landlordId,
      roomId: room.id,
      type: MeterType.ELECTRICITY,
      period: ReadingPeriod.create('2026-10'),
      currentReading: MeterValue.create('2'),
      isBaseline: false,
      previousReading: null,
    };

    await expect(
      recorder.record(input, { kind: 'transaction' }),
    ).rejects.toThrow(BaselineRequiredException);
    expect(readings.save).not.toHaveBeenCalled();

    const duplicateRecorder = new MeterReadingRecorder(
      createRoomRepository(room),
      createMeterRepository({ exists: true }),
      createOutboxRepository(),
    );
    await expect(
      duplicateRecorder.record(input, { kind: 'transaction' }),
    ).rejects.toThrow(DuplicateMeterReadingException);
  });
});
