import { BaseRepository } from 'shared/domain/repositories/base.repository';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { BillingSettingEntity } from '../entities/billing-setting.entity';

export interface BillingSettingRepository extends BaseRepository<BillingSettingEntity> {
  findByIdForUpdate(
    id: Uuid,
    context: TransactionContext,
  ): Promise<BillingSettingEntity | null>;
  findByBuilding(
    buildingId: Uuid,
    context?: TransactionContext,
  ): Promise<BillingSettingEntity | null>;
  findByRoom(
    roomId: Uuid,
    context?: TransactionContext,
  ): Promise<BillingSettingEntity | null>;
}
