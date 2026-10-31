import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OffsetPageQuery } from 'shared/application/pagination/offset-page-query';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { TypeOrmPaginator } from 'shared/infrastructure/database/pagination/typeorm.paginator';
import { withTransaction } from 'shared/infrastructure/database/transaction/typeorm-transaction-context';
import {
  BillingSettingPageFilter,
  BillingSettingPageQueryPort,
} from '../../application/ports/billing-setting-page-query.port';
import { BillingSettingEntity } from '../../domain/entities/billing-setting.entity';
import { BillingSettingScope } from '../../domain/enums/billing-setting-scope.enum';
import { BillingSettingRepository } from '../../domain/repositories/billing-setting.repository';
import { BillingSettingMapper } from './mappers/billing-setting.mapper';
import { BillingSettingTypeormEntity } from './billing-setting.typeorm-entity';

@Injectable()
export class TypeOrmBillingSettingRepository
  implements BillingSettingRepository, BillingSettingPageQueryPort
{
  constructor(
    @InjectRepository(BillingSettingTypeormEntity)
    private readonly repository: Repository<BillingSettingTypeormEntity>,
  ) {}

  async save(
    setting: BillingSettingEntity,
    context?: TransactionContext,
  ): Promise<void> {
    await withTransaction(this.repository, context).save(
      BillingSettingMapper.toPersistence(setting),
    );
  }

  async delete(id: Uuid, context?: TransactionContext): Promise<void> {
    await withTransaction(this.repository, context).update(
      { id },
      { isDeleted: true },
    );
  }

  async findById(
    id: Uuid,
    context?: TransactionContext,
  ): Promise<BillingSettingEntity | null> {
    const raw = await withTransaction(this.repository, context).findOneBy({
      id,
      isDeleted: false,
    });
    return raw ? BillingSettingMapper.toDomain(raw) : null;
  }

  async findByIdForUpdate(
    id: Uuid,
    context: TransactionContext,
  ): Promise<BillingSettingEntity | null> {
    const raw = await withTransaction(this.repository, context).findOne({
      where: { id, isDeleted: false },
      lock: { mode: 'pessimistic_write' },
    });
    return raw ? BillingSettingMapper.toDomain(raw) : null;
  }

  async findByBuilding(
    buildingId: Uuid,
    context?: TransactionContext,
  ): Promise<BillingSettingEntity | null> {
    const raw = await withTransaction(this.repository, context).findOneBy({
      buildingId,
      scope: BillingSettingScope.BUILDING,
      isDeleted: false,
    });
    return raw ? BillingSettingMapper.toDomain(raw) : null;
  }

  async findByRoom(
    roomId: Uuid,
    context?: TransactionContext,
  ): Promise<BillingSettingEntity | null> {
    const raw = await withTransaction(this.repository, context).findOneBy({
      roomId,
      scope: BillingSettingScope.ROOM,
      isDeleted: false,
    });
    return raw ? BillingSettingMapper.toDomain(raw) : null;
  }

  async findPage(
    landlordId: Uuid,
    query: OffsetPageQuery<BillingSettingPageFilter>,
  ): Promise<PaginatedResult<BillingSettingEntity>> {
    const qb = this.repository
      .createQueryBuilder('setting')
      .where('setting.landlordId = :landlordId', { landlordId })
      .andWhere('setting.isDeleted = false');
    if (query.filter?.scope)
      qb.andWhere('setting.scope = :scope', { scope: query.filter.scope });
    if (query.filter?.buildingId)
      qb.andWhere('setting.buildingId = :buildingId', {
        buildingId: query.filter.buildingId,
      });
    if (query.filter?.roomId)
      qb.andWhere('setting.roomId = :roomId', { roomId: query.filter.roomId });
    return TypeOrmPaginator.offset(qb, {
      pageNo: query.pageNo,
      pageSize: query.pageSize,
      sort: query.sort,
      order: query.order,
    })
      .withSort({
        whitelist: ['createdAt'],
        defaultSort: 'createdAt',
        defaultOrder: 'desc',
        alias: 'setting',
      })
      .paginate(BillingSettingMapper.toDomain);
  }
}
