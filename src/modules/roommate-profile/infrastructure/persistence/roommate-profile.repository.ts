import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { OffsetPageQuery } from 'shared/application/pagination/offset-page-query';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { RoommateProfileDetails } from '../../domain/value-objects/roommate-profile-details.vo';
import { RoommateProfileRepository } from '../../domain/repositories/roommate-profile.repository';
import { RoommateProfileReadPort } from '../../application/ports/roommate-profile-read.port';
import { RoommateProfileEntity } from './roommate-profile.entity';

// Lead tenant counts once; linked current members are distinct by tenant ID.
// Unlinked current members count by their own record ID.
export const DISCOVERABLE = `p.is_visible = true AND p.is_deleted = false
  AND (
    NOT EXISTS (
      SELECT 1 FROM contracts c
      WHERE c.is_deleted = false AND c.status = 'active'
        AND (c.tenant_id = p.tenant_id OR EXISTS (
          SELECT 1 FROM contract_members cm WHERE cm.contract_id = c.id
            AND cm.is_deleted = false AND cm.tenant_id = p.tenant_id
            AND cm.joined_at <= CURRENT_DATE
            AND (cm.left_at IS NULL OR cm.left_at > CURRENT_DATE)
        ))
    )
    OR EXISTS (
      SELECT 1 FROM contracts c
      JOIN rooms r ON r.id = c.room_id AND r.is_deleted = false
      WHERE c.is_deleted = false AND c.status = 'active'
        AND (c.tenant_id = p.tenant_id OR EXISTS (
          SELECT 1 FROM contract_members cm WHERE cm.contract_id = c.id
            AND cm.is_deleted = false AND cm.tenant_id = p.tenant_id
            AND cm.joined_at <= CURRENT_DATE
            AND (cm.left_at IS NULL OR cm.left_at > CURRENT_DATE)
        ))
        AND (r.max_occupancy IS NULL OR 1 + (
          SELECT COUNT(DISTINCT COALESCE(cm.tenant_id, cm.id)) FROM contract_members cm
          WHERE cm.contract_id = c.id AND cm.is_deleted = false
            AND cm.joined_at <= CURRENT_DATE
            AND (cm.left_at IS NULL OR cm.left_at > CURRENT_DATE)
            AND (c.tenant_id IS NULL OR cm.tenant_id IS DISTINCT FROM c.tenant_id)
        ) < r.max_occupancy)
    )
  )`;

@Injectable()
export class TypeOrmRoommateProfileRepository
  implements RoommateProfileRepository, RoommateProfileReadPort
{
  constructor(
    @InjectRepository(RoommateProfileEntity)
    private readonly profiles: Repository<RoommateProfileEntity>,
  ) {}

  async save(
    tenantId: string,
    details: RoommateProfileDetails,
  ): Promise<RoommateProfileEntity> {
    await this.profiles.upsert(
      { tenantId, ...details.value, isDeleted: false },
      { conflictPaths: ['tenantId'] },
    );
    return this.profiles.findOneByOrFail({ tenantId });
  }

  findOwn(tenantId: string): Promise<RoommateProfileEntity | null> {
    return this.profiles.findOneBy({ tenantId, isDeleted: false });
  }

  findDiscoverable(id: string): Promise<RoommateProfileEntity | null> {
    return this.profiles
      .createQueryBuilder('p')
      .where('p.id = :id', { id })
      .andWhere(DISCOVERABLE)
      .getOne();
  }

  async findCandidateTenantIds(
    viewerId: string,
    preferredArea?: string,
  ): Promise<string[]> {
    const rows = await this.candidateQuery(viewerId, preferredArea)
      .select('p.tenantId', 'tenantId')
      .getRawMany<{ tenantId: string }>();
    return rows.map((row) => row.tenantId);
  }

  async findPage(
    viewerId: string,
    activeTenantIds: string[],
    options: OffsetPageQuery<{ preferredArea?: string }>,
  ): Promise<PaginatedResult<RoommateProfileEntity>> {
    const { pageNo, pageSize } = options;
    if (activeTenantIds.length === 0) {
      return {
        data: [],
        pagination: {
          type: 'offset',
          pageNo,
          pageSize,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: pageNo > 1,
        },
      };
    }
    const query = this.candidateQuery(
      viewerId,
      options.filter?.preferredArea,
    ).andWhere('p.tenantId IN (:...activeTenantIds)', { activeTenantIds });
    const totalItems = await query.clone().getCount();
    const data = await query
      .orderBy('p.createdAt', 'DESC')
      .addOrderBy('p.id', 'ASC')
      .offset((pageNo - 1) * pageSize)
      .limit(pageSize)
      .getMany();
    const totalPages = Math.ceil(totalItems / pageSize);
    return {
      data,
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

  private candidateQuery(
    viewerId: string,
    preferredArea?: string,
  ): SelectQueryBuilder<RoommateProfileEntity> {
    const query = this.profiles
      .createQueryBuilder('p')
      .where(DISCOVERABLE)
      .andWhere('p.tenant_id != :viewerId', { viewerId });
    if (preferredArea) {
      query.andWhere("p.preferred_area ILIKE :area ESCAPE '\\'", {
        area: `%${preferredArea.replace(/[\\%_]/g, '\\$&')}%`,
      });
    }
    return query;
  }
}
