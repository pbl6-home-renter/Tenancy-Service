import { RoomDeleteCommand } from 'modules/room/application/commands/room-delete/room-delete.command';
import { RoomDeleteCommandHandler } from 'modules/room/application/commands/room-delete/room-delete.command.handler';
import { RoomActiveContractCheckerPort } from 'modules/room/application/ports/room-active-contract-checker.port';
import { Room } from 'modules/room/domain/entities/room.entity';
import { RoomHasActiveContractException } from 'modules/room/domain/exceptions/room-has-active-contract.exception';
import { RoomNotFoundException } from 'modules/room/domain/exceptions/room-not-found.exception';
import { RoomNotOwnedException } from 'modules/room/domain/exceptions/room-not-owned.exception';
import { RoomRepository } from 'modules/room/domain/repositories/room.repository';
import { OutboxRepository } from 'modules/outbox/domain/repositories/outbox.repository';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { generateUuid, Uuid } from 'shared/domain/value-objects/uuid.vo';

function setup(options: { room: Room | null; hasActive: boolean }) {
  const context: TransactionContext = { kind: 'transaction' };
  const roomRepository = {
    findByIdForUpdate: jest.fn(async () => options.room),
    save: jest.fn(async () => undefined),
  };
  const outboxRepository = { append: jest.fn(async () => undefined) };
  const checker: RoomActiveContractCheckerPort = {
    hasActiveContract: jest.fn(
      async (_id: Uuid, passed?: TransactionContext) => {
        expect(passed).toBe(context);
        return options.hasActive;
      },
    ),
  };
  const unitOfWork = {
    run: jest.fn(async (work: (ctx: TransactionContext) => Promise<unknown>) =>
      work(context),
    ),
  };
  const handler = new RoomDeleteCommandHandler(
    roomRepository as unknown as RoomRepository,
    unitOfWork as unknown as IUnitOfWork,
    outboxRepository as unknown as OutboxRepository,
    checker,
  );
  return { handler, roomRepository, outboxRepository, checker };
}

function createRoom(landlordId: Uuid) {
  return Room.create({
    landlordId,
    buildingId: generateUuid(),
    name: 'Room 101',
    rentPrice: 3_000_000,
    depositAmount: 0,
  });
}

describe('RoomDeleteCommandHandler', () => {
  it('rejects deleting a room with an active contract without saving or emitting events', async () => {
    const landlordId = generateUuid();
    const room = createRoom(landlordId);
    const { handler, roomRepository, outboxRepository } = setup({
      room,
      hasActive: true,
    });

    await expect(
      handler.execute(new RoomDeleteCommand(room.id, landlordId)),
    ).rejects.toBeInstanceOf(RoomHasActiveContractException);
    expect(room.isDeleted).toBe(false);
    expect(roomRepository.save).not.toHaveBeenCalled();
    expect(outboxRepository.append).not.toHaveBeenCalled();
  });

  it('soft-deletes a room without an active contract and appends its events', async () => {
    const landlordId = generateUuid();
    const room = createRoom(landlordId);
    room.pullDomainEvents();
    const { handler, roomRepository, outboxRepository } = setup({
      room,
      hasActive: false,
    });

    await handler.execute(new RoomDeleteCommand(room.id, landlordId));

    expect(room.isDeleted).toBe(true);
    expect(roomRepository.save).toHaveBeenCalledTimes(1);
    expect(outboxRepository.append).toHaveBeenCalledTimes(1);
  });

  it('returns 403 for a non-owner before checking contracts', async () => {
    const room = createRoom(generateUuid());
    const { handler, checker } = setup({ room, hasActive: true });

    await expect(
      handler.execute(new RoomDeleteCommand(room.id, generateUuid())),
    ).rejects.toBeInstanceOf(RoomNotOwnedException);
    expect(checker.hasActiveContract).not.toHaveBeenCalled();
  });

  it('returns 404 when the room does not exist', async () => {
    const { handler } = setup({ room: null, hasActive: false });

    await expect(
      handler.execute(new RoomDeleteCommand(generateUuid(), generateUuid())),
    ).rejects.toBeInstanceOf(RoomNotFoundException);
  });
});
