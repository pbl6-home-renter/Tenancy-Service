import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class RatePolicyNotFoundException extends DomainException {
  constructor(id: string) {
    super(`Rate policy "${id}" not found`, 404, 'RESOURCE_NOT_FOUND');
  }
}
