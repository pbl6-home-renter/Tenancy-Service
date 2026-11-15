import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class ContractRestoreRoomUnavailableException extends DomainException {
  constructor() {
    super(
      'Contract room is unavailable for restoration',
      409,
      'CONTRACT_RESTORE_ROOM_UNAVAILABLE',
    );
  }
}
