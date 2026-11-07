import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import {
  MediaOwnershipQueryPort,
  MediaOwnerSnapshot,
  MediaOwnerType,
} from '../../application/ports/media-ownership-query.port';

interface OwnershipRow {
  landlordId: Uuid | null;
  participantUserIds: Uuid[] | null;
  status: string | null;
}

// Keep one fixed query per supported owner type. The key set is checked against
// MediaOwnerType by TypeScript; request values are never interpolated into SQL.
const OWNER_QUERY_BY_TYPE: Readonly<Record<MediaOwnerType, string>> = {
  building: `
    SELECT landlord_id AS "landlordId",
           ARRAY[]::uuid[] AS "participantUserIds",
           status::text AS status
    FROM buildings
    WHERE id = $1 AND is_deleted = false
  `,
  room: `
    SELECT r.landlord_id AS "landlordId",
           ARRAY[]::uuid[] AS "participantUserIds",
           r.status::text AS status
    FROM rooms r
    WHERE r.id = $1 AND r.is_deleted = false
  `,
  contract: `
    SELECT c.landlord_id AS "landlordId",
           COALESCE(array_agg(DISTINCT p.user_id) FILTER (WHERE p.user_id IS NOT NULL), ARRAY[]::uuid[]) AS "participantUserIds",
           c.status::text AS status
    FROM contracts c
    LEFT JOIN LATERAL (
      SELECT c.tenant_id AS user_id
      UNION
      SELECT cm.tenant_id AS user_id
      FROM contract_members cm
      WHERE cm.contract_id = c.id AND cm.is_deleted = false
        AND (cm.left_at IS NULL OR cm.left_at > CURRENT_DATE)
    ) p ON true
    WHERE c.id = $1 AND c.is_deleted = false
    GROUP BY c.id
  `,
  contract_member: `
    SELECT c.landlord_id AS "landlordId",
           COALESCE(array_agg(DISTINCT p.user_id) FILTER (WHERE p.user_id IS NOT NULL), ARRAY[]::uuid[]) AS "participantUserIds",
           c.status::text AS status
    FROM contract_members cm
    JOIN contracts c ON c.id = cm.contract_id AND c.is_deleted = false
    LEFT JOIN LATERAL (
      SELECT c.tenant_id AS user_id
      UNION
      SELECT active_cm.tenant_id AS user_id
      FROM contract_members active_cm
      WHERE active_cm.contract_id = c.id AND active_cm.is_deleted = false
        AND (active_cm.left_at IS NULL OR active_cm.left_at > CURRENT_DATE)
    ) p ON true
    WHERE cm.id = $1 AND cm.is_deleted = false
    GROUP BY c.id
  `,
  meter_reading: `
    SELECT mr.landlord_id AS "landlordId",
           COALESCE(array_agg(DISTINCT p.user_id) FILTER (WHERE p.user_id IS NOT NULL), ARRAY[]::uuid[]) AS "participantUserIds",
           NULL::text AS status
    FROM meter_readings mr
    LEFT JOIN LATERAL (
      SELECT c.tenant_id AS user_id
      FROM contracts c
      WHERE c.room_id = mr.room_id AND c.status = 'active' AND c.is_deleted = false
      UNION
      SELECT cm.tenant_id AS user_id
      FROM contract_members cm
      JOIN contracts c ON c.id = cm.contract_id
      WHERE c.room_id = mr.room_id AND c.status = 'active' AND c.is_deleted = false
        AND cm.is_deleted = false AND (cm.left_at IS NULL OR cm.left_at > CURRENT_DATE)
    ) p ON true
    WHERE mr.id = $1 AND mr.is_deleted = false
    GROUP BY mr.id
  `,
};

@Injectable()
export class TypeOrmMediaOwnershipQuery implements MediaOwnershipQueryPort {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findOwner(
    ownerType: MediaOwnerType,
    ownerId: Uuid,
  ): Promise<MediaOwnerSnapshot | null> {
    const row = await this.findRow(ownerType, ownerId);
    if (!row) return null;
    return {
      ownerType,
      ownerId,
      landlordId: row.landlordId,
      participantUserIds: row.participantUserIds ?? [],
      status: row.status,
    };
  }

  private async findRow(
    ownerType: MediaOwnerType,
    ownerId: Uuid,
  ): Promise<OwnershipRow | null> {
    const sql = OWNER_QUERY_BY_TYPE[ownerType];
    if (!sql) return null;
    const rows = await this.dataSource.query<OwnershipRow[]>(sql, [ownerId]);
    return rows[0] ?? null;
  }
}
