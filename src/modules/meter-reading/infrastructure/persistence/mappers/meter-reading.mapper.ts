import { MeterReadingEntity } from '../../../domain/entities/meter-reading.entity';
import { MeterReadingTypeormEntity } from '../meter-reading.typeorm-entity';

export class MeterReadingMapper {
  static toDomain(raw: MeterReadingTypeormEntity): MeterReadingEntity {
    return MeterReadingEntity.reconstitute({
      id: raw.id,
      landlordId: raw.landlordId,
      buildingId: raw.buildingId,
      roomId: raw.roomId,
      type: raw.type,
      period: raw.period,
      previousReading: raw.previousReading,
      currentReading: raw.currentReading,
      isBaseline: raw.isBaseline,
      evidenceMediaId: raw.evidenceMediaId,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      isDeleted: raw.isDeleted,
    });
  }

  static toPersistence(reading: MeterReadingEntity): MeterReadingTypeormEntity {
    const raw = new MeterReadingTypeormEntity();
    raw.id = reading.id;
    raw.landlordId = reading.landlordId;
    raw.buildingId = reading.buildingId;
    raw.roomId = reading.roomId;
    raw.type = reading.type;
    raw.period = reading.period.value;
    raw.previousReading = reading.previousReading.value;
    raw.currentReading = reading.currentReading.value;
    raw.isBaseline = reading.isBaseline;
    raw.evidenceMediaId = reading.evidenceMediaId;
    raw.createdAt = reading.createdAt;
    raw.updatedAt = reading.updatedAt;
    raw.isDeleted = reading.isDeleted;
    return raw;
  }
}
