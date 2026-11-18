import { ICommand } from '@nestjs/cqrs';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export class FavoriteRoomAddCommand implements ICommand {
  constructor(
    readonly tenantId: Uuid,
    readonly roomId: Uuid,
  ) {}
}

export class FavoriteRoomRemoveCommand implements ICommand {
  constructor(
    readonly tenantId: Uuid,
    readonly roomId: Uuid,
  ) {}
}
