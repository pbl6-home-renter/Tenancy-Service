import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class InvalidRoomException extends DomainException {
  constructor(message: string) {
    super(message, 400, 'INVALID_ROOM');
  }
}
