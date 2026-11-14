import { LandlordLockCycleEntity } from '../../domain/entities/landlord-lock-cycle.entity';

export interface LandlordLockCycleDueQueryPort {
  findDue(now: Date, limit: number): Promise<LandlordLockCycleEntity[]>;
}
