import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { UserRole } from 'shared/domain/enums/user-role.enum';
import { DataSource } from 'typeorm';
import {
  IssueContext,
  IssueContextQueryPort,
} from '../../application/ports/issue-context-query.port';

// The representative also has a contract_members row. Reading members only is
// essential: contracts.tenant_id remains populated after that member leaves.
const CONTEXT_SELECT = `
  SELECT c.id AS "contractId", r.id AS "roomId", r.name AS "roomName",
         b.id AS "buildingId", b.name AS "buildingName", r.landlord_id AS "landlordId",
         c.status::text AS "contractStatus",
         COALESCE(array_agg(DISTINCT m.tenant_id) FILTER (
           WHERE c.status = 'active' AND m.tenant_id IS NOT NULL
             AND m.joined_at <= (NOW() AT TIME ZONE 'UTC')::date
             AND (m.left_at IS NULL OR m.left_at > (NOW() AT TIME ZONE 'UTC')::date)
         ), ARRAY[]::uuid[]) AS "participantUserIds"
  FROM contracts c
  JOIN rooms r ON r.id = c.room_id AND r.is_deleted = false
  JOIN buildings b ON b.id = r.building_id AND b.is_deleted = false
  LEFT JOIN contract_members m ON m.contract_id = c.id AND m.is_deleted = false
  WHERE c.is_deleted = false AND c.landlord_id = r.landlord_id
`;

@Injectable()
export class TypeOrmIssueContextQuery implements IssueContextQueryPort {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findByRoom(roomId: Uuid): Promise<IssueContext | null> {
    const rows = await this.dataSource.query<IssueContext[]>(
      `${CONTEXT_SELECT} AND r.id = $1 AND c.status = 'active'
       GROUP BY c.id, r.id, b.id LIMIT 1`,
      [roomId],
    );
    return rows[0] ?? null;
  }

  async findByContract(contractId: Uuid): Promise<IssueContext | null> {
    const rows = await this.dataSource.query<IssueContext[]>(
      `${CONTEXT_SELECT} AND c.id = $1 GROUP BY c.id, r.id, b.id LIMIT 1`,
      [contractId],
    );
    return rows[0] ?? null;
  }

  async findVisibleContractIds(userId: Uuid, role: UserRole): Promise<Uuid[]> {
    const rows = await this.dataSource.query<{ id: Uuid }[]>(
      `SELECT c.id
       FROM contracts c
       JOIN rooms r ON r.id = c.room_id AND r.is_deleted = false
       JOIN buildings b ON b.id = r.building_id AND b.is_deleted = false
       WHERE c.is_deleted = false AND c.landlord_id = r.landlord_id
         AND (($2 = 'landlord' AND r.landlord_id = $1) OR ($2 = 'tenant' AND c.status = 'active' AND EXISTS (
           SELECT 1 FROM contract_members m
           WHERE m.contract_id = c.id AND m.tenant_id = $1 AND m.is_deleted = false
             AND m.joined_at <= (NOW() AT TIME ZONE 'UTC')::date
             AND (m.left_at IS NULL OR m.left_at > (NOW() AT TIME ZONE 'UTC')::date)
         )))`,
      [userId, role],
    );
    return rows.map((row) => row.id);
  }
}
