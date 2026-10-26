import { Check, Column, Entity, Index } from 'typeorm';
import { AbstractEntity } from 'shared/infrastructure/database/abstract.typeorm-entity';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { BuildingStatus } from '../../domain/enums/building-status.enum';

@Entity('buildings')
@Index('IDX_buildings_landlord', ['landlordId'], {
  where: 'is_deleted = false',
})
@Index('IDX_buildings_status', ['status'], { where: 'is_deleted = false' })
@Check('CHK_buildings_name', 'char_length(btrim(name)) >= 1')
@Check('CHK_buildings_province', 'char_length(btrim(province)) >= 1')
@Check('CHK_buildings_ward', 'char_length(btrim(ward)) >= 1')
@Check('CHK_buildings_address', 'char_length(btrim(address)) >= 1')
@Check('CHK_buildings_latitude', 'latitude BETWEEN -90 AND 90')
@Check('CHK_buildings_longitude', 'longitude BETWEEN -180 AND 180')
@Check(
  'CHK_buildings_note',
  "(note IS NULL OR (char_length(btrim(note)) >= 1 AND char_length(note) <= 500)) AND (status <> 'rejected' OR note IS NOT NULL)",
)
export class BuildingTypeormEntity extends AbstractEntity {
  @Column({ type: 'uuid' })
  landlordId: Uuid;

  @Column({ type: 'varchar', length: 254 })
  name: string;

  @Column({ type: 'varchar', length: 100 })
  province: string;

  @Column({ type: 'varchar', length: 100 })
  ward: string;

  @Column({ type: 'varchar', length: 254 })
  address: string;

  @Column({ type: 'decimal', precision: 9, scale: 6 })
  latitude: string;

  @Column({ type: 'decimal', precision: 9, scale: 6 })
  longitude: string;

  @Column({
    type: 'enum',
    enum: BuildingStatus,
    default: BuildingStatus.PENDING,
  })
  status: BuildingStatus;

  @Column({ type: 'uuid', nullable: true })
  reviewedBy: Uuid | null;

  @Column({ type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;
}
