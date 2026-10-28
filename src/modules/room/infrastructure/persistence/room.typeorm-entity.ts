import { Check, Column, Entity, Index } from 'typeorm';
import { AbstractEntity } from 'shared/infrastructure/database/abstract.typeorm-entity';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { GenderPolicy } from '../../domain/enums/gender-policy.enum';
import { RoomStatus } from '../../domain/enums/room-status.enum';
import { RoomAmenities } from '../../domain/value-objects/room-amenities.vo';

const nullableDecimalTransformer = {
  to: (value: number | null): number | null => value,
  from: (value: string | number | null): number | null =>
    value === null ? null : Number(value),
};

@Entity('rooms')
@Index('IDX_rooms_landlord', ['landlordId'], { where: 'is_deleted = false' })
@Index('IDX_rooms_building', ['buildingId'], { where: 'is_deleted = false' })
@Index('IDX_rooms_status', ['status'], { where: 'is_deleted = false' })
@Index('UQ_rooms_building_name_active', ['buildingId', 'name'], {
  unique: true,
  where: 'is_deleted = false',
})
@Check('CHK_rooms_name', 'char_length(name) >= 1')
@Check(
  'CHK_rooms_description',
  'description IS NULL OR char_length(description) BETWEEN 1 AND 500',
)
@Check('CHK_rooms_floor_number', 'floor_number IS NULL OR floor_number > 0')
@Check('CHK_rooms_area', 'area IS NULL OR area > 0')
@Check('CHK_rooms_max_occupancy', 'max_occupancy IS NULL OR max_occupancy > 0')
@Check('CHK_rooms_rent_price', 'rent_price >= 0')
@Check('CHK_rooms_deposit_amount', 'deposit_amount >= 0')
@Check('CHK_rooms_amenities_object', "jsonb_typeof(amenities) = 'object'")
export class RoomTypeormEntity extends AbstractEntity {
  @Column({ type: 'uuid', name: 'landlord_id' })
  landlordId: Uuid;

  @Column({ type: 'uuid', name: 'building_id' })
  buildingId: Uuid;

  @Column({ type: 'integer', name: 'floor_number', nullable: true })
  floorNumber: number | null;

  @Column({ type: 'varchar', length: 254 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'decimal',
    nullable: true,
    transformer: nullableDecimalTransformer,
  })
  area: number | null;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  amenities: RoomAmenities;

  @Column({ type: 'integer', name: 'max_occupancy', nullable: true })
  maxOccupancy: number | null;

  @Column({
    type: 'enum',
    enum: GenderPolicy,
    enumName: 'room_gender_policy_enum',
    default: GenderPolicy.ANY,
  })
  genderPolicy: GenderPolicy;

  @Column({
    type: 'decimal',
    name: 'rent_price',
    transformer: {
      to: (value: number): number => value,
      from: (value: string | number): number => Number(value),
    },
  })
  rentPrice: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 0,
    name: 'deposit_amount',
    transformer: {
      to: (value: number): number => value,
      from: (value: string | number): number => Number(value),
    },
  })
  depositAmount: number;

  @Column({
    type: 'enum',
    enum: RoomStatus,
    enumName: 'room_status_enum',
    default: RoomStatus.AVAILABLE,
  })
  status: RoomStatus;
}
