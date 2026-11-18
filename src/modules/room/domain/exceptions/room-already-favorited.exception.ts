import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class RoomAlreadyFavoritedException extends DomainException {
  constructor() {
    super('Room already favorited', 409, 'ALREADY_FAVORITED');
  }
}
