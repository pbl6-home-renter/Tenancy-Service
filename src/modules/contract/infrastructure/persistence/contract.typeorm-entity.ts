import { Check, Column, Entity, ForeignKey, Index } from 'typeorm';
import { RoomTypeormEntity } from 'modules/room/infrastructure/persistence/room.typeorm-entity';
import { AbstractEntity } from 'shared/infrastructure/database/abstract.typeorm-entity';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ContractStatus } from '../../domain/enums/contract-status.enum';

const moneyTransformer = {
  to: (value: number): number => value,
  from: (value: string | number): number => Number(value),
};

@Entity('contracts')
@Index('IDX_contracts_landlord', ['landlordId'], {
  where: 'is_deleted = false',
})
@Index('UQ_contracts_room_active', ['roomId'], {
  unique: true,
  where: "status = 'active'",
})
@Check(
  'CHK_contracts_tenant_identity',
  "tenant_id IS NOT NULL OR (NULLIF(BTRIM(tenant_name), '') IS NOT NULL AND NULLIF(BTRIM(tenant_phone), '') IS NOT NULL)",
)
@Check(
  'CHK_contracts_tenant_name',
  'tenant_name IS NULL OR char_length(btrim(tenant_name)) >= 1',
)
@Check(
  'CHK_contracts_tenant_phone',
  "tenant_phone IS NULL OR tenant_phone ~ '^(0[0-9]{9}|[+]84[0-9]{9})$'",
)
@Check('CHK_contracts_dates', 'start_date < end_date')
@Check('CHK_contracts_deposit_amount', 'deposit_amount >= 0')
@Check('CHK_contracts_rent_price', 'rent_price >= 0')
@Check(
  'CHK_contracts_vehicle_count',
  'vehicle_count IS NULL OR vehicle_count >= 0',
)
@Check(
  'CHK_contracts_description',
  'description IS NULL OR (char_length(btrim(description)) >= 1 AND char_length(description) <= 500)',
)
export class ContractTypeormEntity extends AbstractEntity {
  @Column({ type: 'uuid' })
  landlordId: Uuid;

  @Column({ type: 'uuid' })
  @ForeignKey(() => RoomTypeormEntity, 'id', {
    name: 'FK_contracts_room',
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  roomId: Uuid;

  @Column({ type: 'uuid', nullable: true })
  tenantId: Uuid | null;

  @Column({ type: 'varchar', length: 254, nullable: true })
  tenantName: string | null;

  @Column({ type: 'varchar', length: 12, nullable: true })
  tenantPhone: string | null;

  @Column({
    type: 'enum',
    enum: ContractStatus,
    enumName: 'contract_status_enum',
    default: ContractStatus.DRAFT,
  })
  status: ContractStatus;

  @Column({ type: 'decimal', transformer: moneyTransformer })
  depositAmount: number;

  @Column({ type: 'decimal', transformer: moneyTransformer })
  rentPrice: number;

  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date' })
  endDate: string;

  @Column({ type: 'integer', nullable: true })
  vehicleCount: number | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;
}
