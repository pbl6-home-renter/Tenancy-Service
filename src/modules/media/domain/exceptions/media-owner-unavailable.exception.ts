import { DomainException } from 'shared/domain/exceptions/domain.exception';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export class MediaOwnerUnavailableException extends DomainException {
  constructor(ownerType: string, ownerId: Uuid) {
    super(`${ownerType} ${ownerId} not found`, 404, 'RESOURCE_NOT_FOUND');
  }
}
