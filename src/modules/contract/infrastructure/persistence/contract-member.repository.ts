import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { OffsetPageQuery } from 'shared/application/pagination/offset-page-query';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { TypeOrmOffsetPaginator } from 'shared/infrastructure/database/pagination/offset.paginator';
import { withTransaction } from 'shared/infrastructure/database/transaction/typeorm-transaction-context';
import { ContractMember } from '../../domain/entities/contract-member.entity';
import { ContractMemberRepository } from '../../domain/repositories/contract-member.repository';
import { ContractMemberTypeormEntity } from './contract-member.entity';
import { ContractTypeormEntity } from './contract.entity';
import { ContractMemberMapper } from './mappers/contract-member.mapper';
import { TenantPhone } from '../../domain/value-objects/tenant-phone.vo';

@Injectable()
export class TypeOrmContractMemberRepository implements ContractMemberRepository {
  constructor(
    @InjectRepository(ContractMemberTypeormEntity)
    private readonly repository: Repository<ContractMemberTypeormEntity>,
  ) {}

  async findUnlinkedByPhoneForUpdate(
    contractId: Uuid,
    phone: TenantPhone,
    context: TransactionContext,
  ): Promise<ContractMember[]> {
    const rows = await withTransaction(this.repository, context)
      .createQueryBuilder('member')
      .innerJoin(
        ContractTypeormEntity,
        'contract',
        'contract.id = member.contractId',
      )
      .where('member.contractId = :contractId', { contractId })
      .andWhere('contract.isDeleted = false')
      .andWhere('member.isDeleted = false')
      .andWhere('member.tenantId IS NULL')
      .andWhere(
        "regexp_replace(member.tenantPhone, :phonePrefix, '0') = :phone",
        {
          phone: phone.normalizedValue,
          phonePrefix: '^\\+84',
        },
      )
      .orderBy('member.id', 'ASC')
      .setLock('pessimistic_write', undefined, ['member'])
      .getMany();
    return rows.map(ContractMemberMapper.toDomain);
  }

  async save(
    member: ContractMember,
    context?: TransactionContext,
  ): Promise<void> {
    await withTransaction(this.repository, context).save(
      ContractMemberMapper.toPersistence(member),
    );
  }

  async saveMany(
    members: ContractMember[],
    context?: TransactionContext,
  ): Promise<void> {
    if (members.length === 0) return;

    await withTransaction(this.repository, context).save(
      members.map(ContractMemberMapper.toPersistence),
    );
  }

  async findById(
    id: Uuid,
    context?: TransactionContext,
  ): Promise<ContractMember | null> {
    const raw = await withTransaction(this.repository, context).findOne({
      where: { id, isDeleted: false },
    });
    return raw ? ContractMemberMapper.toDomain(raw) : null;
  }

  async findByIdForUpdate(
    id: Uuid,
    context: TransactionContext,
  ): Promise<ContractMember | null> {
    const raw = await withTransaction(this.repository, context).findOne({
      where: { id, isDeleted: false },
      lock: { mode: 'pessimistic_write' },
    });
    return raw ? ContractMemberMapper.toDomain(raw) : null;
  }

  async findByTenantAndContractForUpdate(
    tenantId: Uuid,
    contractId: Uuid,
    context: TransactionContext,
  ): Promise<ContractMember | null> {
    const raw = await withTransaction(this.repository, context)
      .createQueryBuilder('member')
      .innerJoin(
        ContractTypeormEntity,
        'contract',
        'contract.id = member.contractId',
      )
      .where('member.tenantId = :tenantId', { tenantId })
      .andWhere('contract.id = :contractId', { contractId })
      .andWhere('member.isDeleted = false')
      .andWhere('contract.isDeleted = false')
      // Prefer the current membership when this tenant has previously left and rejoined.
      .orderBy('member.leftAt', 'DESC', 'NULLS FIRST')
      .addOrderBy('member.joinedAt', 'DESC')
      .addOrderBy('member.id', 'ASC')
      .limit(1)
      .setLock('pessimistic_write', undefined, ['member'])
      .getOne();
    return raw ? ContractMemberMapper.toDomain(raw) : null;
  }

  async findActiveByContract(
    contractId: Uuid,
    context?: TransactionContext,
  ): Promise<ContractMember[]> {
    const rows = await this.activeQuery(contractId, context).getMany();
    return rows.map(ContractMemberMapper.toDomain);
  }

  existsActiveByContractAndTenant(
    contractId: Uuid,
    tenantId: Uuid,
    context?: TransactionContext,
  ): Promise<boolean> {
    return this.activeQuery(contractId, context)
      .andWhere('member.tenantId = :tenantId', { tenantId })
      .getExists();
  }

  async existsActiveDuplicate(
    contractId: Uuid,
    match: {
      tenantId: Uuid | null;
      tenantPhone: string | null;
      excludeId?: Uuid;
    },
    context?: TransactionContext,
  ): Promise<boolean> {
    if (match.tenantId === null && match.tenantPhone === null) return false;
    const query = this.activeQuery(contractId, context).andWhere(
      new Brackets((builder) => {
        if (match.tenantId !== null)
          builder.orWhere('member.tenantId = :tenantId', {
            tenantId: match.tenantId,
          });
        if (match.tenantPhone !== null)
          builder.orWhere('member.tenantPhone = :tenantPhone', {
            tenantPhone: match.tenantPhone,
          });
      }),
    );
    if (match.excludeId)
      query.andWhere('member.id != :excludeId', { excludeId: match.excludeId });
    return query.getExists();
  }

  findPageByContract(
    contractId: Uuid,
    options: OffsetPageQuery,
  ): Promise<PaginatedResult<ContractMember>> {
    const query = this.repository
      .createQueryBuilder('member')
      .where('member.contractId = :contractId', { contractId })
      .andWhere('member.isDeleted = false');
    return TypeOrmOffsetPaginator.of(query, options)
      .withSort({
        whitelist: ['joinedAt'],
        defaultSort: 'joinedAt',
        defaultOrder: 'asc',
        alias: 'member',
      })
      .paginate(ContractMemberMapper.toDomain);
  }

  countHeadsInPeriod(
    contractId: Uuid,
    periodStart: string,
    periodEnd: string,
    context?: TransactionContext,
  ): Promise<number> {
    return withTransaction(this.repository, context)
      .createQueryBuilder('member')
      .where('member.contractId = :contractId', { contractId })
      .andWhere('member.isDeleted = false')
      .andWhere('member.joinedAt <= :periodEnd', { periodEnd })
      .andWhere('(member.leftAt IS NULL OR member.leftAt >= :periodStart)', {
        periodStart,
      })
      .getCount();
  }

  async delete(id: Uuid, context?: TransactionContext): Promise<void> {
    await withTransaction(this.repository, context).update(
      { id, isDeleted: false },
      { isDeleted: true },
    );
  }

  private activeQuery(contractId: Uuid, context?: TransactionContext) {
    return withTransaction(this.repository, context)
      .createQueryBuilder('member')
      .where('member.contractId = :contractId', { contractId })
      .andWhere('member.isDeleted = false')
      .andWhere('(member.leftAt IS NULL OR member.leftAt > :today)', {
        today: new Date().toISOString().slice(0, 10),
      });
  }
}
