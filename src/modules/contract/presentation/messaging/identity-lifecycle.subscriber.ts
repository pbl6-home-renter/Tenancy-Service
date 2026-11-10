import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { IntegrationEvent } from 'shared/application/messaging/integration-event';
import { ConsumerRegistry } from 'shared/infrastructure/messaging/rabbitmq/consumer/consumer-registry';
import { TenantAccountLinkCommand } from '../../application/commands/tenant-account-link/tenant-account-link.command';
import { TenantPhone } from '../../domain/value-objects/tenant-phone.vo';
import { UserRegisteredEventValidator } from './user-registered.integration-event';
import {
  IDENTITY_LIFECYCLE_CONSUMER_NAME,
  IDENTITY_LIFECYCLE_CONSUMER_QUEUE,
  USER_REGISTERED_EVENT,
} from './identity-lifecycle-consumer.constants';

@Injectable()
export class IdentityLifecycleSubscriber {
  constructor(private readonly commands: CommandBus) {}

  @RabbitSubscribe({
    name: ConsumerRegistry.define({
      name: IDENTITY_LIFECYCLE_CONSUMER_NAME,
      queue: IDENTITY_LIFECYCLE_CONSUMER_QUEUE,
      routingKeys: [USER_REGISTERED_EVENT],
    }),
  })
  async handle(event: IntegrationEvent): Promise<void> {
    UserRegisteredEventValidator.assert(event);
    await this.commands.execute<TenantAccountLinkCommand, void>(
      new TenantAccountLinkCommand(
        event.id,
        event.eventType,
        event.payload.userId,
        event.payload.role,
        event.payload.status,
        TenantPhone.create(event.payload.phone.trim()),
      ),
    );
  }
}
