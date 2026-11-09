import { BaseRepository } from 'shared/domain/repositories/base.repository';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { MeterReadingEntity } from '../entities/meter-reading.entity';
import { MeterType } from '../enums/meter-type.enum';

export interface MeterReadingRepository extends BaseRepository<MeterReadingEntity> {
  findById(
    id: Uuid,
    context?: TransactionContext,
  ): Promise<MeterReadingEntity | null>;
  findLatest(
    roomId: Uuid,
    type: MeterType,
    context: TransactionContext,
  ): Promise<MeterReadingEntity | null>;
  existsFor(
    roomId: Uuid,
    type: MeterType,
    period: string,
    isBaseline: boolean,
    context: TransactionContext,
  ): Promise<boolean>;
  findLatestForRooms(
    roomIds: Uuid[],
    context: TransactionContext,
  ): Promise<MeterReadingEntity[]>;
  insertMany(
    readings: MeterReadingEntity[],
    context: TransactionContext,
  ): Promise<void>;
  hasIssuedInvoice(
    roomId: Uuid,
    period: string,
    context: TransactionContext,
  ): Promise<boolean>;
  findByRoomAndPeriod(
    roomId: Uuid,
    period: string,
    context?: TransactionContext,
  ): Promise<MeterReadingEntity[]>;
}
