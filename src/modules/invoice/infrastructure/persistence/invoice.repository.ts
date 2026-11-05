import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReadingPeriod } from 'modules/meter-reading/domain/value-objects/reading-period.vo';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { withTransaction } from 'shared/infrastructure/database/transaction/typeorm-transaction-context';
import { InvoiceEntity } from '../../domain/entities/invoice.entity';
import { InvoiceStatus } from '../../domain/enums/invoice-status.enum';
import { InvoiceRepository } from '../../domain/repositories/invoice.repository';
import { InvoiceMapper } from './mappers/invoice.mapper';
import { InvoiceTypeormEntity } from './invoice.typeorm-entity';

@Injectable()
export class TypeOrmInvoiceRepository implements InvoiceRepository {
  constructor(
    @InjectRepository(InvoiceTypeormEntity)
    private readonly repository: Repository<InvoiceTypeormEntity>,
  ) {}

  async save(
    invoice: InvoiceEntity,
    context?: TransactionContext,
  ): Promise<void> {
    await withTransaction(this.repository, context).save(
      InvoiceMapper.toPersistence(invoice),
    );
  }

  async delete(_id: Uuid, _context?: TransactionContext): Promise<void> {
    throw new ValidationException(
      'Invoices cannot be deleted; void the invoice instead',
    );
  }

  async findById(
    id: Uuid,
    context?: TransactionContext,
  ): Promise<InvoiceEntity | null> {
    const raw = await withTransaction(this.repository, context).findOneBy({
      id,
      isDeleted: false,
    });
    return raw ? InvoiceMapper.toDomain(raw) : null;
  }

  async findByIdForUpdate(
    id: Uuid,
    context: TransactionContext,
  ): Promise<InvoiceEntity | null> {
    const raw = await withTransaction(this.repository, context)
      .createQueryBuilder('invoice')
      .where('invoice.id = :id', { id })
      .andWhere('invoice.isDeleted = false')
      .setLock('pessimistic_write')
      .getOne();
    return raw ? InvoiceMapper.toDomain(raw) : null;
  }

  async findOpenByContractPeriod(
    contractId: Uuid,
    period: string,
    context?: TransactionContext,
  ): Promise<InvoiceEntity | null> {
    const raw = await withTransaction(this.repository, context)
      .createQueryBuilder('invoice')
      .where('invoice.contractId = :contractId', { contractId })
      .andWhere('invoice.period = :period', { period })
      .andWhere('invoice.isDeleted = false')
      .andWhere('invoice.status IN (:...statuses)', {
        statuses: [InvoiceStatus.PENDING, InvoiceStatus.ISSUED],
      })
      .getOne();
    return raw ? InvoiceMapper.toDomain(raw) : null;
  }

  async findLatestVoidByContractPeriod(
    contractId: Uuid,
    period: string,
    context?: TransactionContext,
  ): Promise<InvoiceEntity | null> {
    const raw = await withTransaction(this.repository, context).findOne({
      where: {
        contractId,
        period: ReadingPeriod.create(period),
        status: InvoiceStatus.VOID,
        isDeleted: false,
      },
      order: { updatedAt: 'DESC' },
    });
    return raw ? InvoiceMapper.toDomain(raw) : null;
  }
}
