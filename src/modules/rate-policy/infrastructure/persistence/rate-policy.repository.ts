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
  RatePolicyPageFilter,
  RatePolicyPageQueryPort,
} from '../../application/ports/rate-policy-page-query.port';
import { RatePolicyEntity } from '../../domain/entities/rate-policy.entity';
import { RatePolicyScope } from '../../domain/enums/rate-policy-scope.enum';
import { RatePolicyRepository } from '../../domain/repositories/rate-policy.repository';
import { RatePolicyMapper } from './mappers/rate-policy.mapper';
import { RatePolicyTypeormEntity } from './rate-policy.typeorm-entity';

@Injectable()
export class TypeOrmRatePolicyRepository
  implements RatePolicyRepository, RatePolicyPageQueryPort
{
  constructor(
    @InjectRepository(RatePolicyTypeormEntity)
    private readonly repository: Repository<RatePolicyTypeormEntity>,
  ) {}

  async save(
    policy: RatePolicyEntity,
    context?: TransactionContext,
  ): Promise<void> {
    await withTransaction(this.repository, context).save(
      RatePolicyMapper.toPersistence(policy),
    );
  }

  async delete(_id: Uuid, _context?: TransactionContext): Promise<void> {
    // D39 keeps one policy per scope and only updates it in place.
    throw new ValidationException('Rate policies cannot be deleted');
  }

  async findById(
    id: Uuid,
    context?: TransactionContext,
  ): Promise<RatePolicyEntity | null> {
    const raw = await withTransaction(this.repository, context).findOneBy({
      id,
    });
    return raw ? RatePolicyMapper.toDomain(raw) : null;
  }

  async findByIdForUpdate(
    id: Uuid,
    context: TransactionContext,
  ): Promise<RatePolicyEntity | null> {
    const raw = await withTransaction(this.repository, context).findOne({
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    return raw ? RatePolicyMapper.toDomain(raw) : null;
  }

  async findByBuilding(
    buildingId: Uuid,
    context?: TransactionContext,
  ): Promise<RatePolicyEntity | null> {
    const raw = await withTransaction(this.repository, context).findOneBy({
      buildingId,
      scope: RatePolicyScope.BUILDING,
    });
    return raw ? RatePolicyMapper.toDomain(raw) : null;
  }

  async findByRoom(
    roomId: Uuid,
    context?: TransactionContext,
  ): Promise<RatePolicyEntity | null> {
    const raw = await withTransaction(this.repository, context).findOneBy({
      roomId,
      scope: RatePolicyScope.ROOM,
    });
    return raw ? RatePolicyMapper.toDomain(raw) : null;
  }

  async findPage(
    landlordId: Uuid,
    query: OffsetPageQuery<RatePolicyPageFilter>,
  ): Promise<PaginatedResult<RatePolicyEntity>> {
    const qb = this.repository
      .createQueryBuilder('policy')
      .where('policy.landlordId = :landlordId', { landlordId })
      .andWhere('policy.isDeleted = false');
    if (query.filter?.scope) {
      qb.andWhere('policy.scope = :scope', { scope: query.filter.scope });
    }
    if (query.filter?.roomId) {
      qb.andWhere('policy.roomId = :roomId', { roomId: query.filter.roomId });
    }
    if (query.filter?.buildingId) {
      qb.andWhere('policy.buildingId = :buildingId', {
        buildingId: query.filter.buildingId,
      });
    }
    if (query.filter?.type) {
      qb.andWhere('policy.rates @> CAST(:rateType AS jsonb)', {
        rateType: JSON.stringify([{ type: query.filter.type }]),
      });
    }
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
        alias: 'policy',
      })
      .paginate(RatePolicyMapper.toDomain);
  }
}
