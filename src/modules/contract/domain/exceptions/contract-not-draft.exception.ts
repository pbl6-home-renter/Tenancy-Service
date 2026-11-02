import { DomainException } from 'shared/domain/exceptions/domain.exception';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export class ContractNotDraftException extends DomainException {
  constructor(id: Uuid) {
    super(`Contract "${id}" is not a draft`, 409, 'CONTRACT_NOT_DRAFT');
  }
}
