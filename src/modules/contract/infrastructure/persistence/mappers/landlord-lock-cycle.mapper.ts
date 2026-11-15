import { LandlordLockCycleEntity } from '../../../domain/entities/landlord-lock-cycle.entity';
import { LandlordLockCycleTypeormEntity } from '../landlord-lock-cycle.typeorm-entity';

export class LandlordLockCycleMapper {
  static toDomain(
    raw: LandlordLockCycleTypeormEntity,
  ): LandlordLockCycleEntity {
    return LandlordLockCycleEntity.reconstitute(raw);
  }

  static toPersistence(
    cycle: LandlordLockCycleEntity,
  ): LandlordLockCycleTypeormEntity {
    const raw = new LandlordLockCycleTypeormEntity();
    raw.id = cycle.id;
    raw.landlordId = cycle.landlordId;
    raw.lockedAt = cycle.lockedAt;
    raw.graceDeadline = cycle.graceDeadline;
    raw.contractIds = cycle.contractIds;
    raw.state = cycle.state;
    raw.createdAt = cycle.createdAt;
    raw.updatedAt = cycle.updatedAt;
    raw.isDeleted = cycle.isDeleted;
    return raw;
  }
}
