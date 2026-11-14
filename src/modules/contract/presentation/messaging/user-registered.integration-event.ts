import { IntegrationEvent } from 'shared/application/messaging/integration-event';
import { UserRole } from 'shared/domain/enums/user-role.enum';
import { UserStatus } from 'shared/domain/enums/user-status.enum';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import {
  USER_REGISTERED_EVENT,
  USER_UPDATED_EVENT,
  USER_DELETED_EVENT,
  USER_EMAIL_VERIFIED_EVENT,
  USER_LOCKED_EVENT,
  USER_UNLOCKED_EVENT,
} from './identity-lifecycle-consumer.constants';

export type UserIdentityLifecyclePayload = {
  userId: Uuid;
  phone: string;
  role: UserRole;
  status: UserStatus;
};

export type UserRegisteredIntegrationEvent =
  IntegrationEvent<UserIdentityLifecyclePayload>;

export type UserLockedIntegrationEvent = IntegrationEvent<{
  userId: Uuid;
  role: UserRole;
  status: UserStatus.LOCKED;
  lockedAt: string;
}> & { eventType: typeof USER_LOCKED_EVENT };

export type UserLifecycleIntegrationEvent =
  | (IntegrationEvent<{
      userId: Uuid;
      status: UserStatus.ACTIVE;
      role?: UserRole;
      phone?: string;
    }> & {
      eventType: typeof USER_UNLOCKED_EVENT;
    })
  | UserLockedIntegrationEvent
  | (UserRegisteredIntegrationEvent & {
      eventType:
        | typeof USER_REGISTERED_EVENT
        | typeof USER_UPDATED_EVENT
        | typeof USER_EMAIL_VERIFIED_EVENT;
    })
  | (IntegrationEvent<{ userId: Uuid }> & {
      eventType: typeof USER_DELETED_EVENT;
    });
