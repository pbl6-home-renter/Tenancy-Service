import { ICommand } from '@nestjs/cqrs';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { UpdateRoomProps } from '../../../domain/entities/room.props';

export class RoomUpdateCommand implements ICommand {
  constructor(
    public readonly roomId: Uuid,
    public readonly landlordId: Uuid,
    public readonly updates: UpdateRoomProps,
  ) {}
}
