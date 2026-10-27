import { IQuery } from '@nestjs/cqrs';
import { OffsetPageQuery } from 'shared/application/pagination/offset-page-query';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { RoomListFilter } from '../../../domain/repositories/room.repository';

export class RoomGetMyRoomsQuery implements IQuery {
  constructor(
    public readonly landlordId: Uuid,
    public readonly options: OffsetPageQuery<RoomListFilter>,
  ) {}
}
