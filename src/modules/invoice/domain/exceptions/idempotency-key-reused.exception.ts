import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class IdempotencyKeyReusedException extends DomainException {
  constructor() {
    super(
      'Idempotency-Key was used for another request',
      409,
      'IDEMPOTENCY_KEY_REUSED',
    );
  }
}
