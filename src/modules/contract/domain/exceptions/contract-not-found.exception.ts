import { DomainException } from 'shared/domain/exceptions/domain.exception';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export class ContractNotFoundException extends DomainException {
  constructor(id: Uuid) {
    super(`Contract "${id}" not found`, 404, 'RESOURCE_NOT_FOUND');
  }
}
