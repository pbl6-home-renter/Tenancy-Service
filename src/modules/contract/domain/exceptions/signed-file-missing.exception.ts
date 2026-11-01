import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class SignedFileMissingException extends DomainException {
  constructor() {
    super(
      'An uploaded signed contract file is required for activation',
      409,
      'SIGNED_FILE_MISSING',
    );
  }
}
