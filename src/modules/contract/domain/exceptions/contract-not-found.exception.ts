import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class ContractNotFoundException extends DomainException {
  constructor(id: string) {
    super(`Contract "${id}" not found`, 404, 'RESOURCE_NOT_FOUND');
  }
}
