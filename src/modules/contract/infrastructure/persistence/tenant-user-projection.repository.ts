import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { withTransaction } from 'shared/infrastructure/database/transaction/typeorm-transaction-context';
import { TenantUserProjectionPort } from '../../application/ports/tenant-user-projection.port';
import { TenantPhone } from '../../domain/value-objects/tenant-phone.vo';
import { TenantUserProjectionTypeormEntity } from './tenant-user-projection.typeorm-entity';

@Injectable()
export class TypeOrmTenantUserProjectionRepository implements TenantUserProjectionPort {
  constructor(
    @InjectRepository(TenantUserProjectionTypeormEntity)
    private readonly repository: Repository<TenantUserProjectionTypeormEntity>,
  ) {}

  async lockPhone(
    phone: TenantPhone,
    context: TransactionContext,
  ): Promise<void> {
    // Serialize registration and member mutations before either locks a contract.
    await withTransaction(this.repository, context).query(
      'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
      ['contract-tenant-phone', phone.normalizedValue],
    );
  }

  async upsert(
    userId: Uuid,
    phone: TenantPhone,
    context: TransactionContext,
  ): Promise<void> {
    await withTransaction(this.repository, context).upsert(
      { userId, phone: phone.normalizedValue, isDeleted: false },
      { conflictPaths: ['userId'], skipUpdateIfNoValuesChanged: false },
    );
  }

  async delete(userId: Uuid, context: TransactionContext): Promise<void> {
    await withTransaction(this.repository, context).delete({ userId });
  }

  async findTenantIdByPhone(
    phone: TenantPhone,
    context: TransactionContext,
  ): Promise<Uuid | null> {
    const user = await withTransaction(this.repository, context).findOne({
      where: { phone: phone.normalizedValue, isDeleted: false },
    });
    return user?.userId ?? null;
  }
}
