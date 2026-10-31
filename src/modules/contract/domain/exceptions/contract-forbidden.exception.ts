import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class ContractForbiddenException extends DomainException {
  constructor() {
    super('You do not have access to this contract or room', 403, 'FORBIDDEN');
  }
}
