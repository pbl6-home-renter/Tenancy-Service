import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { InvoiceIssueResult } from '../../application/commands/invoice-issue/invoice-issue.result';

@Entity('idempotency_keys')
@Index(
  'UQ_idempotency_keys_user_operation_key',
  ['userId', 'operation', 'key'],
  {
    unique: true,
  },
)
export class InvoiceIdempotencyTypeormEntity {
  @PrimaryGeneratedColumn('uuid')
  id: Uuid;

  @Column({ type: 'uuid' })
  key: Uuid;

  @Column({ type: 'uuid' })
  userId: Uuid;

  @Column({ type: 'varchar', length: 64 })
  operation: string;

  @Column({ type: 'varchar', length: 64 })
  requestHash: string;

  @Column({ type: 'jsonb' })
  responseBody: InvoiceIssueResult;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;
}
