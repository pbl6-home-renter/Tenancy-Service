import { MeterReadingEntity } from 'modules/meter-reading/domain/entities/meter-reading.entity';
import { MeterType } from 'modules/meter-reading/domain/enums/meter-type.enum';
import { CurrentReadingInvalidException } from 'modules/meter-reading/domain/exceptions/current-reading-invalid.exception';
import { MeterValue } from 'modules/meter-reading/domain/value-objects/meter-value.vo';
import { ReadingPeriod } from 'modules/meter-reading/domain/value-objects/reading-period.vo';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';

describe('MeterValue', () => {
  it('calculates decimal consumption without floating-point drift', () => {
    expect(
      MeterValue.difference(
        MeterValue.create('10.2'),
        MeterValue.create('9.95'),
      ),
    ).toBe('0.25');
    expect(MeterValue.sum(['0.1', '0.2', '1.05'])).toBe('1.35');
  });

  it('rejects invalid precision and negative readings', () => {
    expect(() => MeterValue.create('1.234')).toThrow(ValidationException);
    expect(() => MeterValue.create('-1')).toThrow(ValidationException);
  });
});

describe('ReadingPeriod', () => {
  it('returns the exact calendar bounds for leap February', () => {
    expect(ReadingPeriod.create('2024-02').bounds()).toEqual({
      start: '2024-02-01',
      end: '2024-02-29',
    });
  });

  it('rejects out-of-range months', () => {
    expect(() => ReadingPeriod.create('2026-13')).toThrow(ValidationException);
  });
});

describe('MeterReadingEntity', () => {
  it('records a reading and emits the corresponding domain event', () => {
    const reading = MeterReadingEntity.record({
      landlordId: generateUuid(),
      buildingId: generateUuid(),
      roomId: generateUuid(),
      type: MeterType.ELECTRICITY,
      period: ReadingPeriod.create('2026-10'),
      previousReading: MeterValue.create('5.5'),
      currentReading: MeterValue.create('7.25'),
      isBaseline: false,
      evidenceMediaIds: [],
    });

    expect(reading.consumption).toBe('1.75');
    expect(reading.pullDomainEvents()).toEqual([
      expect.objectContaining({
        eventType: 'meter_reading.recorded',
        previousReading: '5.5',
        currentReading: '7.25',
      }),
    ]);
  });

  it('rejects a current reading below the previous value and invalid evidence ids', () => {
    const input = {
      landlordId: generateUuid(),
      buildingId: generateUuid(),
      roomId: generateUuid(),
      type: MeterType.WATER,
      period: '2026-10',
      previousReading: '5',
      currentReading: '4',
      isBaseline: false,
      evidenceMediaIds: [],
      id: generateUuid(),
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: false,
    };

    expect(() => MeterReadingEntity.reconstitute(input)).toThrow(
      CurrentReadingInvalidException,
    );
    expect(() =>
      MeterReadingEntity.reconstitute({
        ...input,
        currentReading: '6',
        evidenceMediaIds: ['invalid' as never],
      }),
    ).toThrow(ValidationException);
  });

  it('updates evidence and reading while emitting an updated event', () => {
    const reading = MeterReadingEntity.record({
      landlordId: generateUuid(),
      buildingId: generateUuid(),
      roomId: generateUuid(),
      type: MeterType.WATER,
      period: ReadingPeriod.create('2026-10'),
      previousReading: MeterValue.create('1'),
      currentReading: MeterValue.create('2'),
      isBaseline: false,
      evidenceMediaIds: [],
    });

    reading.pullDomainEvents();
    const mediaId = generateUuid();
    reading.update(MeterValue.create('2.5'), [mediaId]);

    expect(reading.currentReading.value).toBe('2.5');
    expect(reading.evidenceMediaIds).toEqual([mediaId]);
    expect(reading.pullDomainEvents()).toEqual([
      expect.objectContaining({
        eventType: 'meter_reading.updated',
        currentReading: '2.5',
        evidenceMediaIds: [mediaId],
      }),
    ]);
  });
});
