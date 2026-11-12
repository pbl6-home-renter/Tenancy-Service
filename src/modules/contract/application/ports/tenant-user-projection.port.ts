import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { TenantPhone } from '../../domain/value-objects/tenant-phone.vo';

export interface TenantUserProjectionPort {
  lockPhone(phone: TenantPhone, context: TransactionContext): Promise<void>;
  upsert(
    userId: Uuid,
    phone: TenantPhone,
    context: TransactionContext,
  ): Promise<void>;
  delete(userId: Uuid, context: TransactionContext): Promise<void>;
  findTenantIdByPhone(
    phone: TenantPhone,
    context: TransactionContext,
  ): Promise<Uuid | null>;
}
