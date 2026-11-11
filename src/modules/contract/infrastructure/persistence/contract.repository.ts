import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, IsNull, Repository } from 'typeorm';
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
import { ContractMemberTypeormEntity } from './contract-member.entity';
import { ContractMapper } from './mappers/contract.mapper';
import { TenantPhone } from '../../domain/value-objects/tenant-phone.vo';

@Injectable()
export class TypeOrmContractRepository implements ContractRepository {
  constructor(
    @InjectRepository(ContractTypeormEntity)
    private readonly repository: Repository<ContractTypeormEntity>,
  ) {}

  async linkTenantMany(
    ids: Uuid[],
    tenantId: Uuid,
    context: TransactionContext,
  ): Promise<void> {
    if (ids.length === 0) return;

    await withTransaction(this.repository, context).update(
      { id: In(ids), isDeleted: false },
      { tenantId, updatedAt: new Date() },
    );
  }

  async findUnlinkedByPhoneForUpdate(
    phone: TenantPhone,
    context: TransactionContext,
  ): Promise<ContractEntity[]> {
    // Lock parents first, as activation/checkout do, including member-only matches.
    const query = withTransaction(this.repository, context)
      .createQueryBuilder('contract')
      .where({ isDeleted: false });
    const matchingMember = query
      .subQuery()
      .select('1')
      .from(ContractMemberTypeormEntity, 'member')
      .where('member.contractId = contract.id')
      .andWhere({
        isDeleted: false,
        tenantId: IsNull(),
        tenantPhone: phone.normalizedValue,
      });

    const rows = await query
      .andWhere(
        new Brackets((where) => {
          where
            .where({
              tenantId: IsNull(),
              tenantPhone: phone.normalizedValue,
            })
            .orWhere(`EXISTS ${matchingMember.getQuery()}`);
        }),
      )
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

  async findActiveInBuildingPeriod(
    buildingId: Uuid,
    periodStart: string,
    periodEnd: string,
  ): Promise<ContractEntity[]> {
    const rows = await this.repository
      .createQueryBuilder('contract')
      .innerJoin(RoomTypeormEntity, 'room', 'room.id = contract.roomId')
      .where('room.buildingId = :buildingId', { buildingId })
      .andWhere('room.isDeleted = false')
      .andWhere('contract.isDeleted = false')
      .andWhere('contract.status = :status', { status: ContractStatus.ACTIVE })
      .andWhere('contract.startDate <= :periodEnd', { periodEnd })
      .andWhere('contract.endDate >= :periodStart', { periodStart })
      .orderBy('contract.roomId', 'ASC')
      .addOrderBy('contract.id', 'ASC')
      .getMany();
    return rows.map(ContractMapper.toDomain);
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
