import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class MatchRequestIdempotencyKeyReusedException extends DomainException {
  constructor() {
    super(
      'Idempotency key was used for another target',
      409,
      'IDEMPOTENCY_KEY_REUSED',
    );
  }
}
