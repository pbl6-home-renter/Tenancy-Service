import { Inject, Injectable } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { InboxRepository } from 'modules/inbox/application/ports/inbox.repository';
import { INBOX_DI_TOKEN } from 'modules/inbox/inbox.di-token';
import { OutboxMessage } from 'modules/outbox/domain/entities/outbox-message.entity';
import { OutboxRepository } from 'modules/outbox/domain/repositories/outbox.repository';
import { OUTBOX_DI_TOKEN } from 'modules/outbox/outbox.di-token';
import { UNIT_OF_WORK_DI_TOKEN } from 'shared/application/di-tokens';
import { IntegrationEvent } from 'shared/application/messaging/integration-event';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { UserRole } from 'shared/domain/enums/user-role.enum';
import { UserStatus } from 'shared/domain/enums/user-status.enum';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { isValidUuid } from 'shared/domain/value-objects/uuid.vo';
import { ConsumerRegistry } from 'shared/infrastructure/messaging/rabbitmq/consumer/consumer-registry';
import { CONTRACT_DI_TOKEN } from '../../contract.di-token';
import { ContractMemberRepository } from '../../domain/repositories/contract-member.repository';
import { ContractRepository } from '../../domain/repositories/contract.repository';
import { TenantPhone } from '../../domain/value-objects/tenant-phone.vo';
import { UserRegisteredIntegrationEvent } from './user-registered.integration-event';
import {
  IDENTITY_LIFECYCLE_CONSUMER_NAME,
  IDENTITY_LIFECYCLE_CONSUMER_QUEUE,
  USER_REGISTERED_EVENT,
} from './identity-lifecycle-consumer.constants';

@Injectable()
export class IdentityLifecycleSubscriber {
  constructor(
    @Inject(CONTRACT_DI_TOKEN.REPOSITORY)
    private readonly contracts: ContractRepository,
    @Inject(CONTRACT_DI_TOKEN.MEMBER_REPOSITORY)
    private readonly members: ContractMemberRepository,
    @Inject(OUTBOX_DI_TOKEN.REPOSITORY)
    private readonly outbox: OutboxRepository,
    @Inject(INBOX_DI_TOKEN.REPOSITORY)
    private readonly inboxRepository: InboxRepository,
    @Inject(UNIT_OF_WORK_DI_TOKEN)
    private readonly unitOfWork: IUnitOfWork,
  ) {}

  @RabbitSubscribe({
    name: ConsumerRegistry.define({
      name: IDENTITY_LIFECYCLE_CONSUMER_NAME,
      queue: IDENTITY_LIFECYCLE_CONSUMER_QUEUE,
      routingKeys: [USER_REGISTERED_EVENT],
    }),
  })
  async handle(event: IntegrationEvent): Promise<void> {
    this.assertUserRegisteredEvent(event);
    await this.handleOnce(event, (context) => {
      return this.onUserRegistered(event, context);
    });
  }

  private async onUserRegistered(
    event: UserRegisteredIntegrationEvent,
    context: TransactionContext,
  ): Promise<void> {
    const { userId, role, status } = event.payload;
    if (role !== UserRole.TENANT || status !== UserStatus.ACTIVE) return;

    const phone = TenantPhone.create(event.payload.phone.trim());
    const contracts = await this.contracts.findUnlinkedByPhoneForUpdate(
      phone,
      context,
    );
    if (contracts.length === 0) return;

    const linkedContracts = contracts.filter((contract) =>
      contract.linkTenant(userId, phone),
    );
    const members = await this.members.findUnlinkedByPhoneForUpdate(
      contracts.map((contract) => contract.id),
      phone,
      context,
    );
    const linkedMembers = members.filter((member) =>
      member.linkTenant(userId, phone),
    );

    await this.contracts.linkTenantMany(
      linkedContracts.map((contract) => contract.id),
      userId,
      context,
    );
    await this.members.linkTenantMany(
      linkedMembers.map((member) => member.id),
      userId,
      context,
    );
    await this.outbox.append(
      linkedMembers.flatMap((member) =>
        member
          .pullDomainEvents()
          .map((domainEvent) => OutboxMessage.fromDomainEvent(domainEvent)),
      ),
      context,
    );
  }

  private async handleOnce(
    event: IntegrationEvent,
    sideEffect: (context: TransactionContext) => Promise<void>,
  ): Promise<void> {
    await this.unitOfWork.run(async (context) => {
      const isNew = await this.inboxRepository.recordIfNew(
        event.id,
        event.eventType,
        context,
      );
      if (!isNew) return;

      await sideEffect(context);
    });
  }

  private assertUserRegisteredEvent(
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

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
