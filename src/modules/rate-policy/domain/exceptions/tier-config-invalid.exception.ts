import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class TierConfigInvalidException extends DomainException {
  constructor(message = 'Invalid tier configuration') {
    super(message, 422, 'TIER_CONFIG_INVALID');
  }
}
