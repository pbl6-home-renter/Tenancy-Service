import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { withTransaction } from 'shared/infrastructure/database/transaction/typeorm-transaction-context';
import { LandlordLockPort } from '../../application/ports/landlord-lock.port';
import { LandlordLockStateTypeormEntity } from './landlord-lock-state.typeorm-entity';

@Injectable()
export class TypeOrmLandlordLockRepository implements LandlordLockPort {
  constructor(
    @InjectRepository(LandlordLockStateTypeormEntity)
    private readonly repository: Repository<LandlordLockStateTypeormEntity>,
  ) {}

  async setState(
    userId: Uuid,
    lockedAt: Date,
    isLocked: boolean,
    context?: TransactionContext,
  ): Promise<void> {
    // Atomic conflict handling also protects against different envelopes for the
    // same lock, unlock-before-lock delivery, and a delayed previous lock cycle.
    await withTransaction(this.repository, context).query(
      `INSERT INTO landlord_lock_states (user_id, locked_at, is_locked)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET
         locked_at = EXCLUDED.locked_at, is_locked = EXCLUDED.is_locked
       WHERE EXCLUDED.locked_at > landlord_lock_states.locked_at
          OR (EXCLUDED.locked_at = landlord_lock_states.locked_at
              AND landlord_lock_states.is_locked AND NOT EXCLUDED.is_locked)`,
      [userId, lockedAt, isLocked],
    );
  }

  async isLocked(userId: Uuid): Promise<boolean> {
    return this.repository.existsBy({ userId, isLocked: true });
  }
}
