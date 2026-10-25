import { Column, Entity } from 'typeorm';
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
    type: 'enum',
    enum: RoomStatus,
    enumName: 'room_status_enum',
    default: RoomStatus.AVAILABLE,
  })
  status: RoomStatus;
}
