import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { ROOM_DI_TOKEN } from '../../../room.di-token';
import { Room } from '../../../domain/entities/room.entity';
import { RoomRepository } from '../../../domain/repositories/room.repository';
import { RoomGetMyRoomsQuery } from './room-get-my-rooms.query';

@QueryHandler(RoomGetMyRoomsQuery)
export class RoomGetMyRoomsQueryHandler implements IQueryHandler<
  RoomGetMyRoomsQuery,
  PaginatedResult<Room>
> {
  constructor(
    @Inject(ROOM_DI_TOKEN.REPOSITORY)
    private readonly roomRepository: RoomRepository,
  ) {}

  execute(query: RoomGetMyRoomsQuery): Promise<PaginatedResult<Room>> {
    return this.roomRepository.findOwnedPaginated(
      query.landlordId,
      query.options,
    );
  }
}
