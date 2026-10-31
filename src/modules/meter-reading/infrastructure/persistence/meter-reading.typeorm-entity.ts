import { Check, Column, Entity, ForeignKey, Index } from 'typeorm';
import { BuildingTypeormEntity } from 'modules/building/infrastructure/persistence/building.typeorm-entity';
import { RoomTypeormEntity } from 'modules/room/infrastructure/persistence/room.typeorm-entity';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { AbstractEntity } from 'shared/infrastructure/database/abstract.typeorm-entity';
import { MeterType } from '../../domain/enums/meter-type.enum';

@Entity('meter_readings')
@Index('UQ_meter_readings_room_type_period', ['roomId', 'type', 'period'], {
  unique: true,
  where: 'is_deleted = false',
})
@Index('IDX_meter_readings_landlord_period', ['landlordId', 'period'], {
  where: 'is_deleted = false',
})
@Check(
  'CHK_meter_readings_nonnegative',
  'previous_reading >= 0 AND current_reading >= previous_reading',
)
@Check('CHK_meter_readings_period', "period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'")
@Check(
  'CHK_meter_readings_precision',
  'previous_reading = round(previous_reading, 2) AND current_reading = round(current_reading, 2)',
)
export class MeterReadingTypeormEntity extends AbstractEntity {
  @Column({ type: 'uuid' })
  landlordId: Uuid;

  @Column({ type: 'uuid' })
  @ForeignKey(() => BuildingTypeormEntity, 'id', {
    name: 'FK_meter_readings_building',
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  buildingId: Uuid;

  @Column({ type: 'uuid' })
  @ForeignKey(() => RoomTypeormEntity, 'id', {
    name: 'FK_meter_readings_room',
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  roomId: Uuid;

  @Column({
    type: 'enum',
    enum: MeterType,
    enumName: 'meter_reading_type_enum',
  })
  type: MeterType;

  @Column({ type: 'varchar', length: 7 })
  period: string;

  @Column({ type: 'numeric' })
  previousReading: string;

  @Column({ type: 'numeric' })
  currentReading: string;

  @Column({ type: 'boolean', default: false })
  isBaseline: boolean;

  @Column({ type: 'uuid' })
  evidenceMediaId: Uuid;
}
