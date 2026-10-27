import { ICommand } from '@nestjs/cqrs';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export class RoomDeleteCommand implements ICommand {
  constructor(
    public readonly roomId: Uuid,
    public readonly landlordId: Uuid,
  ) {}
}
