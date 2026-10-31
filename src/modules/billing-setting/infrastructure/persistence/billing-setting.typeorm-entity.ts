import { Check, Column, Entity, ForeignKey, Index } from 'typeorm';
import { BuildingTypeormEntity } from 'modules/building/infrastructure/persistence/building.typeorm-entity';
import { RoomTypeormEntity } from 'modules/room/infrastructure/persistence/room.typeorm-entity';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { AbstractEntity } from 'shared/infrastructure/database/abstract.typeorm-entity';
import { BillingSettingScope } from '../../domain/enums/billing-setting-scope.enum';

@Entity('billing_settings')
@Index('UQ_billing_settings_building', ['buildingId'], {
  unique: true,
  where: "scope = 'building' AND is_deleted = false",
})
@Index('UQ_billing_settings_room', ['roomId'], {
  unique: true,
  where: "scope = 'room' AND is_deleted = false",
})
@Check(
  'CHK_billing_settings_scope_target',
  "(scope = 'building' AND building_id IS NOT NULL AND room_id IS NULL) OR (scope = 'room' AND building_id IS NOT NULL AND room_id IS NOT NULL)",
)
@Check(
  'CHK_billing_settings_payment_due_day',
  'payment_due_day BETWEEN 1 AND 28',
)
@Check(
  'CHK_billing_settings_remind_day',
  'remind_day IS NULL OR remind_day BETWEEN 1 AND 28',
)
export class BillingSettingTypeormEntity extends AbstractEntity {
  @Column({ type: 'uuid' })
  landlordId: Uuid;

  @Column({
    type: 'enum',
    enum: BillingSettingScope,
    enumName: 'billing_setting_scope_enum',
  })
  scope: BillingSettingScope;

  @Column({ type: 'uuid' })
  @ForeignKey(() => BuildingTypeormEntity, 'id', {
    name: 'FK_billing_settings_building',
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  buildingId: Uuid;

  @Column({ type: 'uuid', nullable: true })
  @ForeignKey(() => RoomTypeormEntity, 'id', {
    name: 'FK_billing_settings_room',
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  roomId: Uuid | null;

  @Column({ type: 'smallint', default: 5 })
  paymentDueDay: number;

  @Column({ type: 'smallint', nullable: true })
  remindDay: number | null;

  @Column({ type: 'boolean', default: true })
  botEnabled: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}
