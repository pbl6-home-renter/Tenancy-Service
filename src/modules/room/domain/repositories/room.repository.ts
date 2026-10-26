import { BaseRepository } from 'shared/domain/repositories/base.repository';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { Room } from '../entities/room.entity';

export interface RoomRepository extends BaseRepository<Room> {
  findByIdForUpdate(
    id: Uuid,
    context: TransactionContext,
  ): Promise<Room | null>;
  existsByBuildingAndName(
    buildingId: Uuid,
    name: string,
    exceptRoomId?: Uuid,
    context?: TransactionContext,
  ): Promise<boolean>;
}
