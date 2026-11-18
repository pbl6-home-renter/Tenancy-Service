import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { FavoriteRoomPort } from '../../application/ports/favorite-room.port';
import { FavoriteRoomTypeormEntity } from './favorite-room.typeorm-entity';

@Injectable()
export class TypeOrmFavoriteRoomRepository implements FavoriteRoomPort {
  constructor(
    @InjectRepository(FavoriteRoomTypeormEntity)
    private readonly repository: Repository<FavoriteRoomTypeormEntity>,
  ) {}

  async addIfPublic(
    tenantId: Uuid,
    roomId: Uuid,
  ): Promise<{ roomName: string; added: boolean } | null> {
    // Availability and insertion share one snapshot. The PK serializes duplicate saves.
    const rows: { roomName: string; added: boolean }[] =
      await this.repository.query(
        `
      WITH eligible AS MATERIALIZED (
        SELECT r.id, r.name FROM rooms r JOIN buildings b ON b.id = r.building_id
        WHERE r.id = $2 AND r.is_deleted = false AND b.is_deleted = false
          AND r.status = 'available' AND b.status = 'approved'
        FOR SHARE OF r, b
      ), inserted AS (
        INSERT INTO favorite_rooms (tenant_id, room_id)
        SELECT $1, id FROM eligible ON CONFLICT (tenant_id, room_id) DO NOTHING
        RETURNING room_id
      )
      SELECT name AS "roomName", EXISTS (SELECT 1 FROM inserted) AS added FROM eligible
    `,
        [tenantId, roomId],
      );
    return rows[0] ?? null;
  }

  async remove(tenantId: Uuid, roomId: Uuid): Promise<boolean> {
    const result = await this.repository.delete({ tenantId, roomId });
    return (result.affected ?? 0) > 0;
  }
}
