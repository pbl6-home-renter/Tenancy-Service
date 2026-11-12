import { Column, Entity, Index } from 'typeorm';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { AbstractEntity } from 'shared/infrastructure/database/abstract.typeorm-entity';

@Entity('tenant_user_projections')
@Index('UQ_tenant_user_projections_user', ['userId'], { unique: true })
@Index('UQ_tenant_user_projections_phone', ['phone'], { unique: true })
export class TenantUserProjectionTypeormEntity extends AbstractEntity {
  @Column({ type: 'uuid' })
  userId: Uuid;

  @Column({ type: 'varchar', length: 10 })
  phone: string;
}
