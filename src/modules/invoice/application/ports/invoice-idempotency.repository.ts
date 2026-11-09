import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { InvoiceIssueResult } from '../commands/invoice-issue/invoice-issue.result';

export interface InvoiceIdempotencyRecord {
  requestHash: string;
  responseBody: InvoiceIssueResult;
}

export interface InvoiceIdempotencyRepository {
  lock(
    userId: Uuid,
    operation: string,
    key: Uuid,
    context: TransactionContext,
  ): Promise<void>;
  find(
    userId: Uuid,
    operation: string,
    key: Uuid,
    context: TransactionContext,
  ): Promise<InvoiceIdempotencyRecord | null>;
  save(
    userId: Uuid,
    operation: string,
    key: Uuid,
    requestHash: string,
    responseBody: InvoiceIssueResult,
    context: TransactionContext,
  ): Promise<void>;
}
