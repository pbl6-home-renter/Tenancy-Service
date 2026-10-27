import { DomainException } from 'shared/domain/exceptions/domain.exception';
import { RoomStatus } from '../enums/room-status.enum';

export class InvalidRoomTransitionException extends DomainException {
  constructor(from: RoomStatus, to: RoomStatus) {
    super(
      `Cannot transition room from "${from}" to "${to}"`,
      409,
      'INVALID_ROOM_TRANSITION',
    );
  }
}
