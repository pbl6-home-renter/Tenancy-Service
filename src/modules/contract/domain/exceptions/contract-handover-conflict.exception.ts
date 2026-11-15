import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class ContractHandoverConflictException extends DomainException {
  constructor() {
    super(
      'Contract handover was already confirmed for another date',
      409,
      'CONTRACT_HANDOVER_CONFLICT',
    );
  }
}
