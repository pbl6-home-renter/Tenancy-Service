import { IntegrationEvent } from 'shared/application/messaging/integration-event';
import { UserRole } from 'shared/domain/enums/user-role.enum';
import { UserStatus } from 'shared/domain/enums/user-status.enum';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export type UserIdentityLifecyclePayload = {
  userId: Uuid;
  phone: string;
  role: UserRole;
  status: UserStatus;
};

export type UserRegisteredIntegrationEvent =
  IntegrationEvent<UserIdentityLifecyclePayload>;
