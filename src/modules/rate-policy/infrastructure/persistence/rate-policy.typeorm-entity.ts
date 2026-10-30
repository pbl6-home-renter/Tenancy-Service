import { Check, Column, Entity, ForeignKey, Index } from 'typeorm';
import { BuildingTypeormEntity } from 'modules/building/infrastructure/persistence/building.typeorm-entity';
import { RoomTypeormEntity } from 'modules/room/infrastructure/persistence/room.typeorm-entity';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { AbstractEntity } from 'shared/infrastructure/database/abstract.typeorm-entity';
import { RatePolicyScope } from '../../domain/enums/rate-policy-scope.enum';

export interface StoredRateItem {
  type: string;
  name: string;
  rate_kind: string;
  unit_price: string | null;
  steps: { from: number; to: number | null; price: string }[] | null;
  billing_unit: string;
}

@Entity('rate_policies')
@Index('UQ_rate_policies_building', ['buildingId'], {
  unique: true,
  where: "scope = 'building'",
})
@Index('UQ_rate_policies_room', ['roomId'], {
  unique: true,
  where: "scope = 'room'",
})
@Check(
  'CHK_rate_policies_scope_target',
  "(scope = 'building' AND building_id IS NOT NULL AND room_id IS NULL) OR (scope = 'room' AND building_id IS NOT NULL AND room_id IS NOT NULL)",
)
@Check('CHK_rate_policies_rates_array', "jsonb_typeof(rates) = 'array'")
export class RatePolicyTypeormEntity extends AbstractEntity {
  @Column({ type: 'uuid' })
  landlordId: Uuid;

  @Column({
    type: 'enum',
    enum: RatePolicyScope,
    enumName: 'rate_policy_scope_enum',
  })
  scope: RatePolicyScope;

  @Column({ type: 'uuid', nullable: true })
  @ForeignKey(() => BuildingTypeormEntity, 'id', {
    name: 'FK_rate_policies_building',
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  buildingId: Uuid | null;

  @Column({ type: 'uuid', nullable: true })
  @ForeignKey(() => RoomTypeormEntity, 'id', {
    name: 'FK_rate_policies_room',
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  roomId: Uuid | null;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  rates: StoredRateItem[];

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}
