import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class ActiveContractExistsException extends DomainException {
  constructor(roomId: string) {
    super(
      `Room "${roomId}" already has an active contract`,
      409,
      'ACTIVE_CONTRACT_EXISTS',
    );
  }
}
