import { BaseRepository } from 'shared/domain/repositories/base.repository';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { OffsetPageQuery } from 'shared/application/pagination/offset-page-query';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { Room } from '../entities/room.entity';
import { RoomStatus } from '../enums/room-status.enum';

export interface RoomListFilter {
  buildingId?: Uuid;
  status?: RoomStatus;
}

export interface RoomRepository extends BaseRepository<Room> {
  findOwnedPaginated(
    landlordId: Uuid,
    query: OffsetPageQuery<RoomListFilter>,
  ): Promise<PaginatedResult<Room>>;
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
