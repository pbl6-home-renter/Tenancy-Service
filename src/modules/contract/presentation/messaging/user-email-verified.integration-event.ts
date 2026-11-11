import { IntegrationEvent } from 'shared/application/messaging/integration-event';
import { UserIdentityLifecyclePayload } from './user-registered.integration-event';

export type UserEmailVerifiedIntegrationEvent =
  IntegrationEvent<UserIdentityLifecyclePayload>;
