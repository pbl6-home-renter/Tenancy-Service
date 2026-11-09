import { Inject, Injectable } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { CONTRACT_DI_TOKEN } from 'modules/contract/contract.di-token';
import { ContractEntity } from 'modules/contract/domain/entities/contract.entity';
import { ContractRepository } from 'modules/contract/domain/repositories/contract.repository';
import { UNIT_OF_WORK_DI_TOKEN } from 'shared/application/di-tokens';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { INVOICE_DI_TOKEN } from '../../invoice.di-token';
import { InvoiceCalculation } from '../../domain/entities/invoice.props';
import { InvoiceEntity } from '../../domain/entities/invoice.entity';
import { InvoiceBlockReason } from '../../domain/enums/invoice-block-reason.enum';
import { InvoiceStatus } from '../../domain/enums/invoice-status.enum';
import { TotalNegativeException } from '../../domain/exceptions/total-negative.exception';
import { InvoiceRepository } from '../../domain/repositories/invoice.repository';
import { InvoiceGenerateCommand } from '../commands/invoice-generate/invoice-generate.command';
import {
  InvoiceBlockedItem,
  InvoiceGenerateOutcome,
  InvoiceGenerateOutcomeKind,
} from '../commands/invoice-generate/invoice-generate.result';
import { InvoiceCalculationLoaderService } from './invoice-calculation-loader.service';
import { InvoicePersistenceService } from './invoice-persistence.service';

@Injectable()
export class InvoiceGenerationService {
  constructor(
    @Inject(CONTRACT_DI_TOKEN.REPOSITORY)
    private readonly contracts: ContractRepository,
    @Inject(INVOICE_DI_TOKEN.REPOSITORY)
    private readonly invoices: InvoiceRepository,
    @Inject(UNIT_OF_WORK_DI_TOKEN)
    private readonly unitOfWork: IUnitOfWork,
    private readonly calculationLoader: InvoiceCalculationLoaderService,
    private readonly persistence: InvoicePersistenceService,
  ) {}

  async generate(
    contractId: Uuid,
    command: InvoiceGenerateCommand,
  ): Promise<InvoiceGenerateOutcome | null> {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        return await this.unitOfWork.run((context) =>
          this.generateInTransaction(contractId, command, context),
        );
      } catch (error) {
        if (!this.isCodeCollision(error) || attempt === 4) throw error;
      }
    }
    return null;
  }

  private async generateInTransaction(
    contractId: Uuid,
    command: InvoiceGenerateCommand,
    context: TransactionContext,
  ): Promise<InvoiceGenerateOutcome | null> {
    const contract = await this.contracts.findByIdForUpdate(
      contractId,
      context,
    );
    const { start, end } = command.period.bounds();
    if (!contract?.isActiveDuring(start, end)) return null;

    const open = await this.invoices.findOpenByContractPeriod(
      contract.id,
      command.period.value,
      context,
    );
    if (open?.status === InvoiceStatus.ISSUED) return null;

    const calculation = await this.calculationLoader.calculate(
      contract,
      command.buildingId,
      command.period.value,
      start,
      end,
      context,
    );
    if ('reasonCode' in calculation)
      return this.blocked(contract, calculation.reasonCode);

    let invoice: InvoiceEntity;
    let kind: InvoiceGenerateOutcomeKind;
    if (open) {
      try {
        open.recalculate(calculation);
      } catch (error) {
        if (error instanceof TotalNegativeException)
          return this.blocked(contract, InvoiceBlockReason.TOTAL_NEGATIVE);
        throw error;
      }
      invoice = open;
      kind = InvoiceGenerateOutcomeKind.RECALCULATED;
    } else {
      invoice = await this.createInvoice(
        contract,
        command,
        calculation,
        context,
      );
      kind = InvoiceGenerateOutcomeKind.GENERATED;
    }
    await this.persistence.saveWithEvents(invoice, context);
    return {
      kind,
      item: {
        invoiceId: invoice.id,
        code: invoice.code.value,
        contractId: contract.id,
        roomId: contract.roomId,
        totalAmount: invoice.totalAmount,
      },
    };
  }

  private async createInvoice(
    contract: ContractEntity,
    command: InvoiceGenerateCommand,
    calculation: InvoiceCalculation,
    context: TransactionContext,
  ): Promise<InvoiceEntity> {
    const latestVoid = await this.invoices.findLatestVoidByContractPeriod(
      contract.id,
      command.period.value,
      context,
    );
    return InvoiceEntity.create({
      contractId: contract.id,
      period: command.period.value,
      calculation,
      voidedInvoiceId: latestVoid?.id ?? null,
    });
  }

  private blocked(
    contract: ContractEntity,
    reasonCode: InvoiceBlockReason,
  ): InvoiceGenerateOutcome {
    const item: InvoiceBlockedItem = {
      contractId: contract.id,
      roomId: contract.roomId,
      reasonCode,
    };
    return { kind: InvoiceGenerateOutcomeKind.BLOCKED, item };
  }

  private isCodeCollision(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) return false;
    const driverError = error.driverError as {
      code?: string;
      constraint?: string;
    };
    return (
      driverError.code === '23505' &&
      driverError.constraint === 'UQ_invoices_code'
    );
  }
}
