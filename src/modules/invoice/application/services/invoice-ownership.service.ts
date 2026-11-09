import { Inject, Injectable } from '@nestjs/common';
import { CONTRACT_DI_TOKEN } from 'modules/contract/contract.di-token';
import { ContractRepository } from 'modules/contract/domain/repositories/contract.repository';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { InvoiceEntity } from '../../domain/entities/invoice.entity';
import { InvoiceForbiddenException } from '../../domain/exceptions/invoice-forbidden.exception';

@Injectable()
export class InvoiceOwnershipService {
  constructor(
    @Inject(CONTRACT_DI_TOKEN.REPOSITORY)
    private readonly contracts: ContractRepository,
  ) {}

  async assertLandlord(
    invoice: InvoiceEntity,
    landlordId: Uuid,
    context?: TransactionContext,
  ): Promise<void> {
    if (!(await this.isOwnedByLandlord(invoice, landlordId, context)))
      throw new InvoiceForbiddenException();
  }

  async isOwnedByLandlord(
    invoice: InvoiceEntity,
    landlordId: Uuid,
    context?: TransactionContext,
  ): Promise<boolean> {
    const contract = await this.contracts.findById(invoice.contractId, context);
    return contract !== null && contract.landlordId === landlordId;
  }
}
