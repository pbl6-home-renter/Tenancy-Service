import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OffsetPageQuery } from 'shared/application/pagination/offset-page-query';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import {
  ContractTenantFilter,
  ContractTenantReadPort,
} from '../../application/ports/contract-tenant-read.port';
import { ContractTenantListResult } from '../../application/queries/contract-tenant-list/contract-tenant-list.result';
import {
  ContractTenantGetByIdResult,
  ContractTenantMembershipResult,
} from '../../application/queries/contract-tenant-get-by-id/contract-tenant-get-by-id.result';
import { ContractStatus } from '../../domain/enums/contract-status.enum';
import { ContractMemberTypeormEntity } from './contract-member.entity';
import { ContractTypeormEntity } from './contract.entity';

type ContractTenantPageRow = { totalItems: number } & {
  [Key in keyof ContractTenantListResult]: ContractTenantListResult[Key] | null;
};

type ContractTenantMembershipRow = ContractTenantListResult &
  Omit<ContractTenantMembershipResult, 'contractMemberId' | 'tenantName'> & {
    memberId: Uuid;
    memberName: string | null;
  };

@Injectable()
export class TypeOrmContractTenantReadQuery implements ContractTenantReadPort {
  constructor(
    @InjectRepository(ContractMemberTypeormEntity)
    private readonly repository: Repository<ContractMemberTypeormEntity>,
  ) {}

  async findPage(
    landlordId: Uuid,
    options: OffsetPageQuery<ContractTenantFilter>,
  ): Promise<PaginatedResult<ContractTenantListResult>> {
    const { pageNo, pageSize } = options;
    const order = options.order === 'desc' ? 'DESC' : 'ASC';
    const filtered = this.repository.manager
      .createQueryBuilder()
      .select('tenant.*')
      .from('grouped', 'tenant')
      .where('tenant.scope = :scope', {
        scope: options.filter?.scope ?? 'current',
      });
    const page = filtered
      .clone()
      .orderBy('tenant."tenantName"', order, 'NULLS LAST')
      .addOrderBy('tenant."contractMemberId"', 'ASC')
      .limit(pageSize)
      .offset((pageNo - 1) * pageSize);
    const totals = this.repository.manager
      .createQueryBuilder()
      .select('COUNT(*)::int', 'totalItems')
      .from('filtered', 'filtered');

    // The left join preserves the group count on an empty page in one snapshot.
    const rows = await this.repository.manager
      .createQueryBuilder()
      .addCommonTableExpression(
        this.eligibleMemberships(landlordId),
        'eligible',
      )
      .addCommonTableExpression(this.groupedTenants('eligible'), 'grouped')
      .addCommonTableExpression(filtered, 'filtered')
      .addCommonTableExpression(page, 'page')
      .addCommonTableExpression(totals, 'totals')
      .select('page.*')
      .addSelect('totals."totalItems"', 'totalItems')
      .from('totals', 'totals')
      .leftJoin('page', 'page', 'TRUE')
      .orderBy('page."tenantName"', order, 'NULLS LAST')
      .addOrderBy('page."contractMemberId"', 'ASC')
      .getRawMany<ContractTenantPageRow>();
    const totalItems = rows[0].totalItems;
    const totalPages = Math.ceil(totalItems / pageSize);
    return {
      data: rows
        .filter(
          (row): row is ContractTenantPageRow & ContractTenantListResult =>
            row.contractMemberId !== null,
        )
        .map((row) => this.toSummary(row)),
      pagination: {
        type: 'offset',
        pageNo,
        pageSize,
        totalItems,
        totalPages,
        hasNextPage: pageNo < totalPages,
        hasPreviousPage: pageNo > 1,
      },
    };
  }

  async findByMemberId(
    landlordId: Uuid,
    contractMemberId: Uuid,
  ): Promise<ContractTenantGetByIdResult | null> {
    // Both the requested anchor and the expanded group are already owner-scoped.
    const memberships = this.repository.manager
      .createQueryBuilder()
      .select('member.*')
      .from('eligible', 'member')
      .innerJoin(
        'eligible',
        'anchor',
        'anchor.id = :contractMemberId AND anchor.group_key = member.group_key',
        { contractMemberId },
      );
    const rows = await this.repository.manager
      .createQueryBuilder()
      .addCommonTableExpression(
        this.eligibleMemberships(landlordId),
        'eligible',
      )
      .addCommonTableExpression(memberships, 'group_members')
      .addCommonTableExpression(this.groupedTenants('group_members'), 'summary')
      .select('summary.*')
      .addSelect('member.id', 'memberId')
      .addSelect('member.contract_id', 'contractId')
      .addSelect('member.room_id', 'roomId')
      .addSelect('member.status', 'contractStatus')
      .addSelect("to_char(member.joined_at, 'YYYY-MM-DD')", 'joinedAt')
      .addSelect("to_char(member.left_at, 'YYYY-MM-DD')", 'leftAt')
      .addSelect('member.is_current', 'isCurrent')
      .addSelect('member.tenant_name', 'memberName')
      .addSelect('member.tenant_phone', 'tenantPhone')
      .from('summary', 'summary')
      .innerJoin('group_members', 'member', 'TRUE')
      .orderBy('member.joined_at', 'ASC')
      .addOrderBy('member.id', 'ASC')
      .getRawMany<ContractTenantMembershipRow>();
    if (rows.length === 0) return null;
    return {
      ...this.toSummary(rows[0]),
      memberships: rows.map((row) => ({
        contractMemberId: row.memberId,
        contractId: row.contractId,
        roomId: row.roomId,
        contractStatus: row.contractStatus,
        joinedAt: row.joinedAt,
        leftAt: row.leftAt,
        isCurrent: row.isCurrent,
        tenantName: row.memberName,
        tenantPhone: row.tenantPhone,
      })),
    };
  }

  private eligibleMemberships(landlordId: Uuid) {
    return (
      this.repository
        .createQueryBuilder('member')
        .innerJoin(
          ContractTypeormEntity,
          'contract',
          'contract.id = member.contractId',
        )
        .select('member.id', 'id')
        .addSelect('member.contractId', 'contract_id')
        .addSelect('member.tenantId', 'tenant_id')
        .addSelect('member.joinedAt', 'joined_at')
        .addSelect('member.leftAt', 'left_at')
        .addSelect("NULLIF(BTRIM(member.tenantName), '')", 'tenant_name')
        .addSelect("NULLIF(BTRIM(member.tenantPhone), '')", 'tenant_phone')
        .addSelect('contract.roomId', 'room_id')
        .addSelect('contract.status', 'status')
        .addSelect(
          "CASE WHEN member.tenantId IS NULL THEN 'member:' || CAST(member.id AS text) ELSE 'tenant:' || CAST(member.tenantId AS text) END",
          'group_key',
        )
        // P9-07 retains occupancy until handover for lock-cycle terminations.
        .addSelect(
          `(member.leftAt IS NULL OR member.leftAt > :today) AND
        (contract.status IN (:...roomHoldingStatuses) OR
          (contract.status = :terminated AND contract.lockTerminationCycleId IS NOT NULL
            AND contract.handoverCompletedOn IS NULL))`,
          'is_current',
        )
        .where('contract.landlordId = :landlordId', { landlordId })
        .andWhere('contract.isDeleted = false')
        .andWhere('member.isDeleted = false')
        .andWhere('contract.activatedAt IS NOT NULL')
        .andWhere('member.joinedAt <= :today')
        .setParameters({
          today: new Date().toISOString().slice(0, 10),
          roomHoldingStatuses: [
            ContractStatus.ACTIVE,
            ContractStatus.SUSPENDED,
          ],
          terminated: ContractStatus.TERMINATED,
        })
    );
  }

  private groupedTenants(table: 'eligible' | 'group_members') {
    return this.repository.manager
      .createQueryBuilder()
      .select(
        '(array_agg(member.id ORDER BY member.joined_at, member.id))[1]',
        'contractMemberId',
      )
      .addSelect(
        '(array_agg(member.tenant_name ORDER BY member.joined_at, member.id) FILTER (WHERE member.tenant_name IS NOT NULL))[1]',
        'tenantName',
      )
      .addSelect('bool_or(member.tenant_id IS NOT NULL)', 'isLinked')
      .addSelect(
        "CASE WHEN bool_or(member.is_current) THEN 'current' ELSE 'history' END",
        'scope',
      )
      .addSelect('COUNT(DISTINCT member.contract_id)::int', 'contractCount')
      .from(table, 'member')
      .groupBy('member.group_key');
  }

  private toSummary(row: ContractTenantListResult): ContractTenantListResult {
    return {
      contractMemberId: row.contractMemberId,
      tenantName: row.tenantName,
      isLinked: row.isLinked,
      scope: row.scope,
      contractCount: row.contractCount,
    };
  }
}
