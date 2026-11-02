import { Check, Column, Entity, ForeignKey, Index } from 'typeorm';
import { AbstractEntity } from 'shared/infrastructure/database/abstract.typeorm-entity';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ContractTypeormEntity } from './contract.entity';

const dateTransformer = {
  to: (value: Date | null): string | null =>
    value === null ? null : value.toISOString().slice(0, 10),
  from: (value: string | null): Date | null =>
    value === null ? null : new Date(`${value}T00:00:00.000Z`),
};

@Entity('contract_members')
@Index('IDX_contract_members_tenant', ['tenantId'])
@Index('IDX_contract_members_contract', ['contractId'])
@Index('UQ_contract_members_active_tenant', ['contractId', 'tenantId'], {
  unique: true,
  where: 'tenant_id IS NOT NULL AND left_at IS NULL AND is_deleted = false',
})
@Check('CHK_contract_members_dates', 'left_at IS NULL OR left_at >= joined_at')
@Check(
  'CHK_contract_members_identity',
  "tenant_id IS NOT NULL OR (NULLIF(BTRIM(tenant_name), '') IS NOT NULL AND tenant_phone IS NOT NULL)",
)
@Check(
  'CHK_contract_members_name',
  'tenant_name IS NULL OR char_length(btrim(tenant_name)) >= 1',
)
@Check(
  'CHK_contract_members_phone',
  "tenant_phone IS NULL OR tenant_phone ~ '^(0[0-9]{9}|[+]84[0-9]{9})$'",
)
export class ContractMemberTypeormEntity extends AbstractEntity {
  @Column({ type: 'uuid' })
  @ForeignKey(() => ContractTypeormEntity, 'id', {
    name: 'FK_contract_members_contract',
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  contractId: Uuid;

  @Column({ type: 'uuid', nullable: true })
  tenantId: Uuid | null;

  @Column({ type: 'varchar', length: 254, nullable: true })
  tenantName: string | null;

  @Column({ type: 'varchar', length: 12, nullable: true })
  tenantPhone: string | null;

  @Column({ type: 'date', transformer: dateTransformer })
  joinedAt: Date;

  @Column({ type: 'date', nullable: true, transformer: dateTransformer })
  leftAt: Date | null;
}
