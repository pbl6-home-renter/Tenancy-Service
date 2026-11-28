import { Column, Entity, PrimaryColumn } from 'typeorm';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

/** An unlocked row is an ordering tombstone, not membership in the locked set. */
@Entity('landlord_lock_states')
export class LandlordLockStateTypeormEntity {
  @PrimaryColumn('uuid') userId: Uuid;
  @Column('timestamptz') lockedAt: Date;
  @Column('boolean') isLocked: boolean;
}
