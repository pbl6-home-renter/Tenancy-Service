import {
  FavoriteRoomAddCommandHandler,
  FavoriteRoomRemoveCommandHandler,
} from 'modules/room/application/commands/favorite-room/favorite-room.command.handler';
import {
  FavoriteRoomAddCommand,
  FavoriteRoomRemoveCommand,
} from 'modules/room/application/commands/favorite-room/favorite-room.command';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';

describe('Tenant favorites', () => {
  it('passes the authenticated tenant ID, returns saved room data and rejects duplicates', async () => {
    const tenantId = generateUuid(),
      roomId = generateUuid();
    const repository = {
      addIfPublic: jest.fn(async () => ({ roomName: '101', added: true })),
      remove: jest.fn(),
    };
    const handler = new FavoriteRoomAddCommandHandler(repository);
    expect(
      await handler.execute(new FavoriteRoomAddCommand(tenantId, roomId)),
    ).toEqual({ roomId, roomName: '101' });
    expect(repository.addIfPublic).toHaveBeenCalledWith(tenantId, roomId);
    repository.addIfPublic.mockResolvedValueOnce({
      roomName: '101',
      added: false,
    });
    await expect(
      handler.execute(new FavoriteRoomAddCommand(tenantId, roomId)),
    ).rejects.toMatchObject({ statusCode: 409, code: 'ALREADY_FAVORITED' });
  });

  it("does not save unavailable rooms and only removes the caller's own saved record", async () => {
    const repository = {
      addIfPublic: jest.fn(async () => null),
      remove: jest.fn(async () => true),
    };
    const tenantId = generateUuid(),
      roomId = generateUuid();
    await expect(
      new FavoriteRoomAddCommandHandler(repository).execute(
        new FavoriteRoomAddCommand(tenantId, roomId),
      ),
    ).rejects.toMatchObject({ statusCode: 404 });
    const remove = new FavoriteRoomRemoveCommandHandler(repository);
    await remove.execute(new FavoriteRoomRemoveCommand(tenantId, roomId));
    expect(repository.remove).toHaveBeenCalledWith(tenantId, roomId);
    repository.remove.mockResolvedValueOnce(false);
    await expect(
      remove.execute(new FavoriteRoomRemoveCommand(generateUuid(), roomId)),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});
