import { DomainException } from 'shared/domain/exceptions/domain.exception';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export class RoomNotFoundException extends DomainException {
  constructor(id: Uuid) {
    super(`Room "${id}" not found`, 404, 'RESOURCE_NOT_FOUND');
  }
}
