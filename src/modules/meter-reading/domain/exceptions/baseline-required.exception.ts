import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class BaselineRequiredException extends DomainException {
  constructor() {
    super('The first reading must be a baseline', 422, 'BASELINE_REQUIRED');
  }
}
