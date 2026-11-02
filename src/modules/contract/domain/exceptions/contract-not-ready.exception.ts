import { DomainException } from 'shared/domain/exceptions/domain.exception';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export class ContractNotReadyException extends DomainException {
  constructor(id: Uuid) {
    super(
      `Contract "${id}" is not ready for activation`,
      409,
      'CONTRACT_NOT_READY',
    );
  }
}
