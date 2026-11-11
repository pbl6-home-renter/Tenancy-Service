import { Room } from 'modules/room/domain/entities/room.entity';
import { RoomStatus } from 'modules/room/domain/enums/room-status.enum';
import { InvalidRoomException } from 'modules/room/domain/exceptions/invalid-room.exception';
import { DepositAmount } from 'modules/room/domain/value-objects/deposit-amount.vo';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';

describe('DepositAmount', () => {
  it('accepts zero and rejects negative values', () => {
    expect(DepositAmount.create(0).value).toBe(0);
    expect(() => DepositAmount.create(-1)).toThrow(ValidationException);
  });
});

describe('Room', () => {
  it('derives occupancy from contracts and requires a ready transition after maintenance', () => {
    const room = Room.create({
      landlordId: generateUuid(),
      buildingId: generateUuid(),
      name: 'Room 101',
      rentPrice: 3_000_000,
      depositAmount: 0,
    });

    room.occupyByContract();
    expect(room.status).toBe(RoomStatus.OCCUPIED);
    expect(() => room.changeStatus(RoomStatus.OCCUPIED)).toThrow(
      InvalidRoomException,
    );
    room.releaseByContract();
    expect(room.status).toBe(RoomStatus.MAINTENANCE);
    room.markReady();

    expect(room.status).toBe(RoomStatus.AVAILABLE);
    expect(room.pullDomainEvents().map((event) => event.eventType)).toEqual([
      'room.created',
      'room.status_changed',
      'room.status_changed',
      'room.status_changed',
    ]);
  });

  it('rejects duplicate photo references without mutating its state', () => {
    const room = Room.create({
      landlordId: generateUuid(),
      buildingId: generateUuid(),
      name: 'Room 101',
      rentPrice: 3_000_000,
      depositAmount: 0,
    });
    const mediaId = generateUuid();

    expect(() => room.update({ photoMediaIds: [mediaId, mediaId] })).toThrow(
      InvalidRoomException,
    );
    expect(room.photoMediaIds).toEqual([]);
  });
});
