import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoommateProfileDetails } from '../../domain/value-objects/roommate-profile-details.vo';
import { RoommateProfileRepositoryPort } from '../../application/ports/roommate-profile.repository.port';
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
export class TypeOrmRoommateProfileRepository implements RoommateProfileRepositoryPort {
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

  findCandidates(
    viewerId: string,
    preferredArea?: string,
  ): Promise<RoommateProfileEntity[]> {
    const query = this.profiles
      .createQueryBuilder('p')
      .where(DISCOVERABLE)
      .andWhere('p.tenant_id != :viewerId', { viewerId });
    if (preferredArea) {
      query.andWhere("p.preferred_area ILIKE :area ESCAPE '\\'", {
        area: `%${preferredArea.replace(/[\\%_]/g, '\\$&')}%`,
      });
    }
    return query
      .orderBy('p.created_at', 'DESC')
      .addOrderBy('p.id', 'ASC')
      .getMany();
  }
}
