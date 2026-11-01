import { Column, Entity, Index } from 'typeorm';
import { AbstractEntity } from 'shared/infrastructure/database/abstract.typeorm-entity';

@Entity('contract_templates')
@Index('UQ_contract_templates_template_key', ['templateKey'], { unique: true })
export class ContractTemplateTypeormEntity extends AbstractEntity {
  @Column({ type: 'varchar', length: 100 })
  templateKey: string;

  @Column({ type: 'varchar', length: 254 })
  title: string;

  @Column({ type: 'varchar', length: 50 })
  version: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'jsonb' })
  requiredVariables: string[];

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}
