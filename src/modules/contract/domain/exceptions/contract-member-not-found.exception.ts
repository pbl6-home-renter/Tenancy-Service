import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class ContractMemberNotFoundException extends DomainException {
  constructor() {
    super('Contract member not found', 404, 'RESOURCE_NOT_FOUND');
  }
}
