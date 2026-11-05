import { BaseRepository } from 'shared/domain/repositories/base.repository';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { InvoiceEntity } from '../entities/invoice.entity';

export interface InvoiceRepository extends BaseRepository<InvoiceEntity> {
  findById(
    id: Uuid,
    context?: TransactionContext,
  ): Promise<InvoiceEntity | null>;
  findByIdForUpdate(
    id: Uuid,
    context: TransactionContext,
  ): Promise<InvoiceEntity | null>;
  findOpenByContractPeriod(
    contractId: Uuid,
    period: string,
    context?: TransactionContext,
  ): Promise<InvoiceEntity | null>;
  findLatestVoidByContractPeriod(
    contractId: Uuid,
    period: string,
    context?: TransactionContext,
  ): Promise<InvoiceEntity | null>;
}
