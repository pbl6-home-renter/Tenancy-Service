import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class RoommateTenantInactiveException extends DomainException {
  constructor() {
    super('An active tenant account is required', 403, 'FORBIDDEN');
  }
}
