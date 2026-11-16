import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { withTransaction } from 'shared/infrastructure/database/transaction/typeorm-transaction-context';
import { MatchRequestPageQueryPort } from '../../application/ports/match-request-page-query.port';
import { MatchRequestEntity } from '../../domain/entities/match-request.entity';
import { MatchRequestStatus } from '../../domain/enums/match-request-status.enum';
import { MatchRequestDuplicateException } from '../../domain/exceptions/match-request-duplicate.exception';
import { MatchRequestIdempotencyKeyReusedException } from '../../domain/exceptions/match-request-idempotency-key-reused.exception';
import { MatchRequestRepository } from '../../domain/repositories/match-request.repository';
import { MatchRequestMapper } from './mappers/match-request.mapper';
import { MatchRequestTypeormEntity } from './match-request.typeorm-entity';

@Injectable()
export class TypeOrmMatchRequestRepository
  implements MatchRequestRepository, MatchRequestPageQueryPort
{
  constructor(
    @InjectRepository(MatchRequestTypeormEntity)
    private readonly rows: Repository<MatchRequestTypeormEntity>,
  ) {}

  async findByRequestKey(
    requesterId: Uuid,
    key: Uuid,
  ): Promise<MatchRequestEntity | null> {
    const row = await this.rows.findOneBy({ requesterId, idempotencyKey: key });
    return row ? MatchRequestMapper.toDomain(row) : null;
  }

  async insertOrFind(
    request: MatchRequestEntity,
    context: TransactionContext,
  ): Promise<{ request: MatchRequestEntity; created: boolean }> {
    const repo = withTransaction(this.rows, context);
    const byKey = await repo.findOneBy({
      requesterId: request.requesterId,
      idempotencyKey: request.idempotencyKey,
    });
    if (byKey) return this.replayed(byKey, request.targetId);
    const result = await repo
      .createQueryBuilder()
      .insert()
      .into(MatchRequestTypeormEntity)
      .values(MatchRequestMapper.toPersistence(request))
      .orIgnore()
      .returning('id')
      .execute();
    if (result.raw.length > 0) return { request, created: true };
    const racedKey = await repo.findOneBy({
      requesterId: request.requesterId,
      idempotencyKey: request.idempotencyKey,
    });
    if (racedKey) return this.replayed(racedKey, request.targetId);
    throw new MatchRequestDuplicateException();
  }

  private replayed(
    row: MatchRequestTypeormEntity,
    targetId: Uuid,
  ): { request: MatchRequestEntity; created: false } {
    if (row.targetId.toLowerCase() !== targetId.toLowerCase())
      throw new MatchRequestIdempotencyKeyReusedException();
    return { request: MatchRequestMapper.toDomain(row), created: false };
  }

  async findByIdForUpdate(
    id: Uuid,
    context: TransactionContext,
  ): Promise<MatchRequestEntity | null> {
    const row = await withTransaction(this.rows, context).findOne({
      where: { id, isDeleted: false },
      lock: { mode: 'pessimistic_write' },
    });
    return row ? MatchRequestMapper.toDomain(row) : null;
  }

  async save(
    request: MatchRequestEntity,
    context: TransactionContext,
  ): Promise<void> {
    await withTransaction(this.rows, context).save(
      MatchRequestMapper.toPersistence(request),
    );
  }

  async findPage(
    actorId: Uuid,
    options: {
      pageNo: number;
      pageSize: number;
      direction?: 'incoming' | 'outgoing';
      status?: MatchRequestStatus;
    },
  ): Promise<PaginatedResult<MatchRequestEntity>> {
    const qb = this.rows
      .createQueryBuilder('request')
      .where('request.isDeleted = false');
    if (options.direction === 'incoming')
      qb.andWhere('request.targetId = :actorId', { actorId });
    else if (options.direction === 'outgoing')
      qb.andWhere('request.requesterId = :actorId', { actorId });
    else
      qb.andWhere(
        new Brackets((where) =>
          where
            .where('request.requesterId = :actorId', { actorId })
            .orWhere('request.targetId = :actorId', { actorId }),
        ),
      );
    if (options.status)
      qb.andWhere('request.status = :status', { status: options.status });
    const [rows, totalItems] = await qb
      .orderBy('request.createdAt', 'DESC')
      .addOrderBy('request.id', 'ASC')
      .skip((options.pageNo - 1) * options.pageSize)
      .take(options.pageSize)
      .getManyAndCount();
    const totalPages = Math.ceil(totalItems / options.pageSize);
    return {
      data: rows.map(MatchRequestMapper.toDomain),
      pagination: {
        type: 'offset',
        pageNo: options.pageNo,
        pageSize: options.pageSize,
        totalItems,
        totalPages,
        hasNextPage: options.pageNo < totalPages,
        hasPreviousPage: options.pageNo > 1,
      },
    };
  }
}
