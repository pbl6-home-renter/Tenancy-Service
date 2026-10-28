import { DomainException } from 'shared/domain/exceptions/domain.exception';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export class DuplicateRoomException extends DomainException {
  constructor(buildingId: Uuid, name: string) {
    super(
      `Room "${name}" already exists in building "${buildingId}"`,
      409,
      'DUPLICATE_ROOM',
    );
  }
}
