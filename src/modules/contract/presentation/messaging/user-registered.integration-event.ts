import { IntegrationEvent } from 'shared/application/messaging/integration-event';
import { UserRole } from 'shared/domain/enums/user-role.enum';
import { UserStatus } from 'shared/domain/enums/user-status.enum';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { isValidUuid, Uuid } from 'shared/domain/value-objects/uuid.vo';
import { USER_REGISTERED_EVENT } from './identity-lifecycle-consumer.constants';

export type UserRegisteredIntegrationEvent = IntegrationEvent<{
  userId: Uuid;
  phone: string;
  role: UserRole;
  status: UserStatus;
}>;

export class UserRegisteredEventValidator {
  static assert(
    event: unknown,
  ): asserts event is UserRegisteredIntegrationEvent {
    if (
      !this.isRecord(event) ||
      typeof event.id !== 'string' ||
      !isValidUuid(event.id) ||
      event.eventType !== USER_REGISTERED_EVENT ||
      event.routingKey !== USER_REGISTERED_EVENT ||
      !this.isRecord(event.payload) ||
      typeof event.payload.userId !== 'string' ||
      !isValidUuid(event.payload.userId) ||
      typeof event.payload.phone !== 'string' ||
      !Object.values(UserRole).includes(event.payload.role as UserRole) ||
      !Object.values(UserStatus).includes(event.payload.status as UserStatus)
    ) {
      throw new ValidationException(
        'Invalid user.registered integration event',
      );
    }
  }

  private static isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
