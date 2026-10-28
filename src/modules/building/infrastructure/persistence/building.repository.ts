import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OffsetPageQuery } from 'shared/application/pagination/offset-page-query';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { withTransaction } from 'shared/infrastructure/database/transaction/typeorm-transaction-context';
import { TypeOrmPaginator } from 'shared/infrastructure/database/pagination/typeorm.paginator';
import { BuildingEntity } from '../../domain/entities/building.entity';
import {
  BuildingRepository,
  MyBuildingFilter,
} from '../../domain/repositories/building.repository';
import { BuildingTypeormEntity } from './building.typeorm-entity';
import { BuildingMapper } from './mappers/building.mapper';

@Injectable()
export class TypeOrmBuildingRepository implements BuildingRepository {
  constructor(
    @InjectRepository(BuildingTypeormEntity)
    private readonly repository: Repository<BuildingTypeormEntity>,
  ) {}

  async save(
    building: BuildingEntity,
    context?: TransactionContext,
  ): Promise<void> {
    await withTransaction(this.repository, context).save(
      BuildingMapper.toPersistence(building),
    );
  }

  async findById(
    id: Uuid,
    context?: TransactionContext,
  ): Promise<BuildingEntity | null> {
    const raw = await withTransaction(this.repository, context).findOne({
      where: { id, isDeleted: false },
    });
    return raw ? BuildingMapper.toDomain(raw) : null;
  }

  async findMyBuildings(
    landlordId: Uuid,
    query: OffsetPageQuery<MyBuildingFilter>,
  ): Promise<PaginatedResult<BuildingEntity>> {
    const qb = this.repository
      .createQueryBuilder('building')
      .where('building.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('building.landlordId = :landlordId', { landlordId });

    if (query.filter?.status) {
      qb.andWhere('building.status = :status', { status: query.filter.status });
    }

    return TypeOrmPaginator.offset(qb, query)
      .withSort({
        whitelist: ['createdAt', 'name', 'status'],
        defaultSort: 'createdAt',
        defaultOrder: 'desc',
        alias: 'building',
      })
      .paginate(BuildingMapper.toDomain);
  }

  async findMyBuildingById(
    landlordId: Uuid,
    id: Uuid,
  ): Promise<BuildingEntity | null> {
    const raw = await this.repository
      .createQueryBuilder('building')
      .where('building.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('building.landlordId = :landlordId', { landlordId })
      .andWhere('building.id = :id', { id })
      .getOne();
    return raw ? BuildingMapper.toDomain(raw) : null;
  }

  async findByIdForUpdate(
    id: Uuid,
    context: TransactionContext,
  ): Promise<BuildingEntity | null> {
    const raw = await withTransaction(this.repository, context).findOne({
      where: { id, isDeleted: false },
      lock: { mode: 'pessimistic_write' },
    });
    return raw ? BuildingMapper.toDomain(raw) : null;
  }

  async delete(id: Uuid, context?: TransactionContext): Promise<void> {
    await withTransaction(this.repository, context).update(id, {
      isDeleted: true,
    });
  }
}
