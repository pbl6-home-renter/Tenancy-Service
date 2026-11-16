import { Check, Column, Entity, Index } from 'typeorm';
import { AbstractEntity } from 'shared/infrastructure/database/abstract.typeorm-entity';

export interface RoommateLifestyle {
  cleanAndTidy?: boolean;
  earlyBird?: boolean;
  nightOwl?: boolean;
  petFriendly?: boolean;
  smoking?: boolean;
  cooking?: boolean;
  guestsAllowed?: boolean;
}

const numeric = {
  to: (value: number | null): number | null => value,
  from: (value: string | number | null): number | null =>
    value === null ? null : Number(value),
};

@Entity('roommate_profiles')
@Index('UQ_roommate_profiles_tenant', ['tenantId'], { unique: true })
@Index('IDX_roommate_profiles_visible', ['id'], {
  where: 'is_visible = true AND is_deleted = false',
})
@Check(
  'CHK_roommate_profiles_budget',
  'budget_min IS NULL OR budget_max IS NULL OR budget_min <= budget_max',
)
@Check(
  'CHK_roommate_profiles_visible_bio',
  "is_visible = false OR NULLIF(BTRIM(bio), '') IS NOT NULL",
)
export class RoommateProfileEntity extends AbstractEntity {
  @Column({ type: 'uuid' })
  tenantId: string;

  @Column({ type: 'boolean', default: false })
  isVisible: boolean;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  bio: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  gender: string | null;

  @Column({ type: 'integer', nullable: true })
  birthYear: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  occupation: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  preferredProvince: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  preferredDistrict: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  preferredArea: string | null;

  @Column({
    type: 'numeric',
    precision: 15,
    scale: 0,
    nullable: true,
    transformer: numeric,
  })
  budgetMin: number | null;

  @Column({
    type: 'numeric',
    precision: 15,
    scale: 0,
    nullable: true,
    transformer: numeric,
  })
  budgetMax: number | null;

  @Column({ type: 'date', nullable: true })
  moveInOn: string | null;

  @Column({ type: 'jsonb', nullable: true })
  lifestyle: RoommateLifestyle | null;
}
