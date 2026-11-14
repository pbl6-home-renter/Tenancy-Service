import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { withTransaction } from 'shared/infrastructure/database/transaction/typeorm-transaction-context';
import { LandlordLockCycleDueQueryPort } from '../../application/ports/landlord-lock-cycle-due-query.port';
import { LandlordLockCycleEntity } from '../../domain/entities/landlord-lock-cycle.entity';
import { LandlordLockCycleRepository } from '../../domain/repositories/landlord-lock-cycle.repository';
import { LandlordLockCycleTypeormEntity } from './landlord-lock-cycle.typeorm-entity';
import { LandlordLockCycleMapper } from './mappers/landlord-lock-cycle.mapper';

@Injectable()
export class TypeOrmLandlordLockCycleRepository
  implements LandlordLockCycleRepository, LandlordLockCycleDueQueryPort
{
  constructor(
    @InjectRepository(LandlordLockCycleTypeormEntity)
    private readonly repository: Repository<LandlordLockCycleTypeormEntity>,
  ) {}

  async lockLandlord(
    landlordId: Uuid,
    context: TransactionContext,
  ): Promise<void> {
    // Serializes first-cycle creation too, when there is no row to lock yet.
    await withTransaction(this.repository, context).query(
      'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
      ['landlord-lock-cycle', landlordId],
    );
  }

  async findLatestForUpdate(
    landlordId: Uuid,
    context: TransactionContext,
  ): Promise<LandlordLockCycleEntity | null> {
    const row = await withTransaction(this.repository, context).findOne({
      where: { landlordId, isDeleted: false },
      order: { lockedAt: 'DESC' },
      lock: { mode: 'pessimistic_write' },
    });
    return row ? LandlordLockCycleMapper.toDomain(row) : null;
  }

  async findById(id: Uuid): Promise<LandlordLockCycleEntity | null> {
    const row = await this.repository.findOne({
      where: { id, isDeleted: false },
    });
    return row ? LandlordLockCycleMapper.toDomain(row) : null;
  }

  async save(
    cycle: LandlordLockCycleEntity,
    context?: TransactionContext,
  ): Promise<void> {
    await withTransaction(this.repository, context).save(
      LandlordLockCycleMapper.toPersistence(cycle),
    );
  }

  async delete(id: Uuid, context?: TransactionContext): Promise<void> {
    await withTransaction(this.repository, context).update(
      { id },
      { isDeleted: true },
    );
  }

  async findDue(now: Date, limit: number): Promise<LandlordLockCycleEntity[]> {
    const rows = await this.repository.find({
      where: {
        state: 'pending',
        graceDeadline: LessThanOrEqual(now),
        isDeleted: false,
      },
      order: { graceDeadline: 'ASC', id: 'ASC' },
      take: limit,
    });
    return rows.map(LandlordLockCycleMapper.toDomain);
  }
}
