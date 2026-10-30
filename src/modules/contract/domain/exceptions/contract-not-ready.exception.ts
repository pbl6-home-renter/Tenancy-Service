import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class ContractNotReadyException extends DomainException {
  constructor(id: string) {
    super(
      `Contract "${id}" is not ready for activation`,
      409,
      'CONTRACT_NOT_READY',
    );
  }
}
