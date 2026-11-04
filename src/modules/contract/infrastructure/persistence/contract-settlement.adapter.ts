import { Injectable } from '@nestjs/common';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { TypeOrmTransactionContext } from 'shared/infrastructure/database/transaction/typeorm-transaction-context';
import { ContractSettlementPort } from '../../application/ports/contract-settlement.port';

@Injectable()
export class ContractSettlementAdapter implements ContractSettlementPort {
  async isPeriodSettled(
    contractId: Uuid,
    period: string,
    context: TransactionContext,
  ): Promise<boolean> {
    if (!(context instanceof TypeOrmTransactionContext)) {
      throw new Error('Contract settlement requires a TypeORM transaction');
    }
    const row = await context.manager
      .createQueryBuilder()
      .select(
        "bool_or(invoice.status = 'issued') AND NOT bool_or(invoice.status = 'pending')",
        'settled',
      )
      .from('invoices', 'invoice')
      .where('invoice.contract_id = :contractId', { contractId })
      .andWhere('invoice.period = :period', { period })
      .andWhere('invoice.is_deleted = false')
      .getRawOne<{ settled: boolean | null }>();
    return row?.settled === true;
  }
}
