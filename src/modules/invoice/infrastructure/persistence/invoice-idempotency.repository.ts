import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { withTransaction } from 'shared/infrastructure/database/transaction/typeorm-transaction-context';
import { InvoiceIssueResult } from '../../application/commands/invoice-issue/invoice-issue.result';
import {
  InvoiceIdempotencyRepository,
  InvoiceIdempotencyRecord,
} from '../../application/ports/invoice-idempotency.repository';
import { InvoiceIdempotencyTypeormEntity } from './invoice-idempotency.typeorm-entity';

@Injectable()
export class TypeOrmInvoiceIdempotencyRepository implements InvoiceIdempotencyRepository {
  private static readonly KEY_TTL_MS = 24 * 60 * 60 * 1000;

  constructor(
    @InjectRepository(InvoiceIdempotencyTypeormEntity)
    private readonly repository: Repository<InvoiceIdempotencyTypeormEntity>,
  ) {}

  async lock(
    userId: Uuid,
    operation: string,
    key: Uuid,
    context: TransactionContext,
  ): Promise<void> {
    await withTransaction(this.repository, context).query(
      'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
      [userId, `${operation}:${key}`],
    );
  }

  async find(
    userId: Uuid,
    operation: string,
    key: Uuid,
    context: TransactionContext,
  ): Promise<InvoiceIdempotencyRecord | null> {
    const repository = withTransaction(this.repository, context);
    const record = await repository.findOneBy({ userId, operation, key });
    if (!record) return null;
    if (record.expiresAt.getTime() <= Date.now()) {
      await repository.delete(record.id);
      return null;
    }
    return {
      requestHash: record.requestHash,
      responseBody: record.responseBody,
    };
  }

  async save(
    userId: Uuid,
    operation: string,
    key: Uuid,
    requestHash: string,
    responseBody: InvoiceIssueResult,
    context: TransactionContext,
  ): Promise<void> {
    const now = new Date();
    await withTransaction(this.repository, context).save({
      key,
      userId,
      operation,
      requestHash,
      responseBody,
      createdAt: now,
      expiresAt: new Date(
        now.getTime() + TypeOrmInvoiceIdempotencyRepository.KEY_TTL_MS,
      ),
    });
  }
}
