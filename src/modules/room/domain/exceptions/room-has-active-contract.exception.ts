import { DomainException } from 'shared/domain/exceptions/domain.exception';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export class RoomHasActiveContractException extends DomainException {
  constructor(roomId: Uuid) {
    super(
      `Room "${roomId}" has an active contract and cannot be deleted`,
      409,
      'ROOM_HAS_ACTIVE_CONTRACT',
    );
  }
}
