import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { OffsetPageQuery } from 'shared/application/pagination/offset-page-query';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { TypeOrmOffsetPaginator } from 'shared/infrastructure/database/pagination/offset.paginator';
import { withTransaction } from 'shared/infrastructure/database/transaction/typeorm-transaction-context';
import { RoomTypeormEntity } from 'modules/room/infrastructure/persistence/room.typeorm-entity';
import { ContractEntity } from '../../domain/entities/contract.entity';
import { ContractStatus } from '../../domain/enums/contract-status.enum';
import {
  ContractListFilter,
  ContractRepository,
} from '../../domain/repositories/contract.repository';
import { ContractTypeormEntity } from './contract.entity';
import { ContractMapper } from './mappers/contract.mapper';
import { TenantPhone } from '../../domain/value-objects/tenant-phone.vo';

@Injectable()
export class TypeOrmContractRepository implements ContractRepository {
  constructor(
    @InjectRepository(ContractTypeormEntity)
    private readonly repository: Repository<ContractTypeormEntity>,
  ) {}

  async findUnlinkedByPhoneForUpdate(
    phone: TenantPhone,
    context: TransactionContext,
  ): Promise<ContractEntity[]> {
    // Lock parents first, as activation/checkout do, including member-only matches.
    const rows = await withTransaction(this.repository, context)
      .createQueryBuilder('contract')
      .where('contract.isDeleted = false')
      .andWhere(
        new Brackets((query) => {
          query.where(
            "(contract.tenantId IS NULL AND regexp_replace(contract.tenantPhone, :phonePrefix, '0') = :phone)",
          ).orWhere(`EXISTS (
            SELECT 1 FROM contract_members member
            WHERE member.contract_id = contract.id
              AND member.is_deleted = false AND member.tenant_id IS NULL
              AND regexp_replace(member.tenant_phone, :phonePrefix, '0') = :phone
          )`);
        }),
      )
      .setParameters({ phone: phone.normalizedValue, phonePrefix: '^\\+84' })
      .orderBy('contract.id', 'ASC')
      .setLock('pessimistic_write')
      .getMany();
    return rows.map(ContractMapper.toDomain);
  }

  async save(
    contract: ContractEntity,
    context?: TransactionContext,
  ): Promise<void> {
    await withTransaction(this.repository, context).save(
      ContractMapper.toPersistence(contract),
    );
  }

  async findById(
    id: Uuid,
    context?: TransactionContext,
  ): Promise<ContractEntity | null> {
    const raw = await withTransaction(this.repository, context).findOne({
      where: { id, isDeleted: false },
    });
    return raw ? ContractMapper.toDomain(raw) : null;
  }

  async findByIdForUpdate(
    id: Uuid,
    context: TransactionContext,
  ): Promise<ContractEntity | null> {
    const raw = await withTransaction(this.repository, context).findOne({
      where: { id, isDeleted: false },
      lock: { mode: 'pessimistic_write' },
    });
    return raw ? ContractMapper.toDomain(raw) : null;
  }

  async existsActiveByRoom(
    roomId: Uuid,
    context?: TransactionContext,
  ): Promise<boolean> {
    return withTransaction(this.repository, context).existsBy({
      roomId,
      status: ContractStatus.ACTIVE,
    });
  }

  async findPageByLandlord(
    landlordId: Uuid,
    options: OffsetPageQuery<ContractListFilter>,
  ): Promise<PaginatedResult<ContractEntity>> {
    const query = this.repository
      .createQueryBuilder('contract')
      .where('contract.landlordId = :landlordId', { landlordId })
      .andWhere('contract.isDeleted = :isDeleted', { isDeleted: false });

    if (options.filter?.roomId) {
      query.andWhere('contract.roomId = :roomId', {
        roomId: options.filter.roomId,
      });
    }
    if (options.filter?.buildingId) {
      query
        .innerJoin(RoomTypeormEntity, 'room', 'room.id = contract.roomId')
        .andWhere('room.buildingId = :buildingId', {
          buildingId: options.filter.buildingId,
        });
    }
    if (options.filter?.status) {
      query.andWhere('contract.status = :status', {
        status: options.filter.status,
      });
    }
    if (options.filter?.tenantId) {
      query.andWhere('contract.tenantId = :tenantId', {
        tenantId: options.filter.tenantId,
      });
    }

    return TypeOrmOffsetPaginator.of(query, options)
      .withSort({
        whitelist: ['createdAt'],
        defaultSort: 'createdAt',
        defaultOrder: 'desc',
        alias: 'contract',
      })
      .paginate(ContractMapper.toDomain);
  }

  async delete(id: Uuid, context?: TransactionContext): Promise<void> {
    await withTransaction(this.repository, context).update(
      { id, isDeleted: false },
      { isDeleted: true },
    );
  }
}
