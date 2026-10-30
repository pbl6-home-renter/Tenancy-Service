import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class ContractNotDraftException extends DomainException {
  constructor(id: string) {
    super(`Contract "${id}" is not a draft`, 409, 'CONTRACT_NOT_DRAFT');
  }
}
