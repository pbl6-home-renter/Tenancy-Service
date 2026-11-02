import { DomainException } from 'shared/domain/exceptions/domain.exception';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export class ActiveContractExistsException extends DomainException {
  constructor(roomId: Uuid) {
    super(
      `Room "${roomId}" already has an active contract`,
      409,
      'ACTIVE_CONTRACT_EXISTS',
    );
  }
}
