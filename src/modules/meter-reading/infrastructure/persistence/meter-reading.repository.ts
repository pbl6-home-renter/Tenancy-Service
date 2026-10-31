import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OffsetPageQuery } from 'shared/application/pagination/offset-page-query';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { TypeOrmPaginator } from 'shared/infrastructure/database/pagination/typeorm.paginator';
import { withTransaction } from 'shared/infrastructure/database/transaction/typeorm-transaction-context';
import {
  MeterReadingPageFilter,
  MeterReadingPageQueryPort,
} from '../../application/ports/meter-reading-page-query.port';
import { MeterReadingEntity } from '../../domain/entities/meter-reading.entity';
import { MeterType } from '../../domain/enums/meter-type.enum';
import { MeterReadingRepository } from '../../domain/repositories/meter-reading.repository';
import { MeterReadingMapper } from './mappers/meter-reading.mapper';
import { MeterReadingTypeormEntity } from './meter-reading.typeorm-entity';

@Injectable()
export class TypeOrmMeterReadingRepository
  implements MeterReadingRepository, MeterReadingPageQueryPort
{
  constructor(
    @InjectRepository(MeterReadingTypeormEntity)
    private readonly repository: Repository<MeterReadingTypeormEntity>,
  ) {}

  async save(
    reading: MeterReadingEntity,
    context?: TransactionContext,
  ): Promise<void> {
    await withTransaction(this.repository, context).save(
      MeterReadingMapper.toPersistence(reading),
    );
  }

  async findById(
    id: Uuid,
    context?: TransactionContext,
  ): Promise<MeterReadingEntity | null> {
    const raw = await withTransaction(this.repository, context).findOneBy({
      id,
      isDeleted: false,
    });
    return raw ? MeterReadingMapper.toDomain(raw) : null;
  }

  async delete(_id: Uuid, _context?: TransactionContext): Promise<void> {
    throw new ValidationException('Meter readings cannot be deleted');
  }

  async findLatest(
    roomId: Uuid,
    type: MeterType,
    context: TransactionContext,
  ): Promise<MeterReadingEntity | null> {
    const raw = await withTransaction(this.repository, context).findOne({
      where: { roomId, type, isDeleted: false },
      order: { period: 'DESC' },
    });
    return raw ? MeterReadingMapper.toDomain(raw) : null;
  }

  async existsFor(
    roomId: Uuid,
    type: MeterType,
    period: string,
    context: TransactionContext,
  ): Promise<boolean> {
    return withTransaction(this.repository, context).existsBy({
      roomId,
      type,
      period,
      isDeleted: false,
    });
  }

  async findPage(
    landlordId: Uuid,
    query: OffsetPageQuery<MeterReadingPageFilter>,
  ): Promise<PaginatedResult<MeterReadingEntity>> {
    const qb = this.repository
      .createQueryBuilder('reading')
      .where('reading.landlordId = :landlordId', { landlordId })
      .andWhere('reading.isDeleted = false');
    if (query.filter?.roomId)
      qb.andWhere('reading.roomId = :roomId', { roomId: query.filter.roomId });
    if (query.filter?.type)
      qb.andWhere('reading.type = :type', { type: query.filter.type });
    if (query.filter?.period)
      qb.andWhere('reading.period = :period', { period: query.filter.period });
    return TypeOrmPaginator.offset(qb, {
      pageNo: query.pageNo,
      pageSize: query.pageSize,
      sort: query.sort,
      order: query.order,
    })
      .withSort({
        whitelist: ['period', 'createdAt'],
        defaultSort: 'period',
        defaultOrder: 'desc',
        alias: 'reading',
      })
      .paginate(MeterReadingMapper.toDomain);
  }
}
