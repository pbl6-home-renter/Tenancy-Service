import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class EvidenceRequiredException extends DomainException {
  constructor() {
    super(
      'A meter reading requires an evidence image',
      422,
      'EVIDENCE_REQUIRED',
    );
  }
}
