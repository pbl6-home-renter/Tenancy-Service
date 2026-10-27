import { DomainException } from 'shared/domain/exceptions/domain.exception';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export class RoomNotOwnedException extends DomainException {
  constructor(roomId: Uuid, landlordId: Uuid) {
    super(
      `Room "${roomId}" does not belong to landlord "${landlordId}"`,
      403,
      'FORBIDDEN',
    );
  }
}
