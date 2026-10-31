import { BaseRepository } from 'shared/domain/repositories/base.repository';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { MeterReadingEntity } from '../entities/meter-reading.entity';
import { MeterType } from '../enums/meter-type.enum';

export interface MeterReadingRepository extends BaseRepository<MeterReadingEntity> {
  findLatest(
    roomId: Uuid,
    type: MeterType,
    context: TransactionContext,
  ): Promise<MeterReadingEntity | null>;
  existsFor(
    roomId: Uuid,
    type: MeterType,
    period: string,
    context: TransactionContext,
  ): Promise<boolean>;
}
