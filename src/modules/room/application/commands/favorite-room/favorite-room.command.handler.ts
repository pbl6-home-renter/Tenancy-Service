import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RoomAlreadyFavoritedException } from '../../../domain/exceptions/room-already-favorited.exception';
import { RoomNotFoundException } from '../../../domain/exceptions/room-not-found.exception';
import { ROOM_DI_TOKEN } from '../../../room.di-token';
import { FavoriteRoomPort } from '../../ports/favorite-room.port';
import {
  FavoriteRoomAddCommand,
  FavoriteRoomRemoveCommand,
} from './favorite-room.command';

@CommandHandler(FavoriteRoomAddCommand)
export class FavoriteRoomAddCommandHandler implements ICommandHandler<FavoriteRoomAddCommand> {
  constructor(
    @Inject(ROOM_DI_TOKEN.FAVORITES)
    private readonly favorites: FavoriteRoomPort,
  ) {}

  async execute(command: FavoriteRoomAddCommand) {
    const result = await this.favorites.addIfPublic(
      command.tenantId,
      command.roomId,
    );
    if (!result) throw new RoomNotFoundException(command.roomId);
    if (!result.added) throw new RoomAlreadyFavoritedException();
    return { roomId: command.roomId, roomName: result.roomName };
  }
}

@CommandHandler(FavoriteRoomRemoveCommand)
export class FavoriteRoomRemoveCommandHandler implements ICommandHandler<
  FavoriteRoomRemoveCommand,
  void
> {
  constructor(
    @Inject(ROOM_DI_TOKEN.FAVORITES)
    private readonly favorites: FavoriteRoomPort,
  ) {}

  async execute(command: FavoriteRoomRemoveCommand): Promise<void> {
    if (!(await this.favorites.remove(command.tenantId, command.roomId))) {
      throw new RoomNotFoundException(command.roomId);
    }
  }
}
