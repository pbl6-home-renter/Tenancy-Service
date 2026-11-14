import { Check, Column, Entity, Index } from 'typeorm';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { AbstractEntity } from 'shared/infrastructure/database/abstract.typeorm-entity';
import { LandlordLockCycleProps } from '../../domain/entities/landlord-lock-cycle.entity';

@Entity('landlord_lock_cycles')
@Index(
  'UQ_landlord_lock_cycles_landlord_locked_at',
  ['landlordId', 'lockedAt'],
  { unique: true },
)
@Index('IDX_landlord_lock_cycles_due', ['graceDeadline'], {
  where: "state = 'pending' AND is_deleted = false",
})
@Check('CHK_landlord_lock_cycles_deadline', 'grace_deadline > locked_at')
@Check(
  'CHK_landlord_lock_cycles_state',
  "state IN ('pending', 'elapsed', 'superseded')",
)
export class LandlordLockCycleTypeormEntity extends AbstractEntity {
  @Column({ type: 'uuid' })
  landlordId: Uuid;

  @Column({ type: 'timestamptz' })
  lockedAt: Date;

  @Column({ type: 'timestamptz' })
  graceDeadline: Date;

  @Column({ type: 'uuid', array: true })
  contractIds: Uuid[];

  @Column({ type: 'varchar', length: 20 })
  state: LandlordLockCycleProps['state'];
}
