import { CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

@Entity('favorite_rooms')
export class FavoriteRoomTypeormEntity {
  @PrimaryColumn({ type: 'uuid', name: 'tenant_id' })
  tenantId: Uuid;

  @PrimaryColumn({ type: 'uuid', name: 'room_id' })
  roomId: Uuid;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
