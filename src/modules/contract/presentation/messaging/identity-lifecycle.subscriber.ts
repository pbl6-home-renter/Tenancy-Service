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
import { TenantUserProjectionPort } from '../../application/ports/tenant-user-projection.port';
import { ContractMemberNotificationRequestedEvent } from '../../domain/events/contract-member-notification-requested.event';
import { ContractMemberRepository } from '../../domain/repositories/contract-member.repository';
import { ContractRepository } from '../../domain/repositories/contract.repository';
import { TenantPhone } from '../../domain/value-objects/tenant-phone.vo';
import {
  UserLifecycleIntegrationEvent,
  UserRegisteredIntegrationEvent,
} from './user-registered.integration-event';
import {
  IDENTITY_LIFECYCLE_CONSUMER_NAME,
  IDENTITY_LIFECYCLE_CONSUMER_QUEUE,
  USER_REGISTERED_EVENT,
  USER_UPDATED_EVENT,
  USER_DELETED_EVENT,
  USER_EMAIL_VERIFIED_EVENT,
  USER_LOCKED_EVENT,
  USER_UNLOCKED_EVENT,
} from './identity-lifecycle-consumer.constants';

@Injectable()
export class IdentityLifecycleSubscriber {
  constructor(
    @Inject(CONTRACT_DI_TOKEN.TENANT_USER_PROJECTION)
    private readonly tenantUsers: TenantUserProjectionPort,
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
      routingKeys: [
        USER_REGISTERED_EVENT,
        USER_UPDATED_EVENT,
        USER_DELETED_EVENT,
        USER_EMAIL_VERIFIED_EVENT,
        USER_LOCKED_EVENT,
        USER_UNLOCKED_EVENT,
      ],
    }),
  })
  async handle(event: IntegrationEvent): Promise<void> {
    this.assertUserLifecycleEvent(event);
    await this.handleOnce(event, (context) => {
      if (event.eventType === USER_UNLOCKED_EVENT) {
        if (event.payload.role === UserRole.LANDLORD) return Promise.resolve();
        const { role, phone } = event.payload;
        // Older producers did not include the tenant lookup snapshot.
        if (role === undefined || phone === undefined) return Promise.resolve();
        return this.onUserChanged(
          { ...event, payload: { ...event.payload, role, phone } },
          context,
        );
      }
      if (event.eventType === USER_LOCKED_EVENT) {
        if (event.payload.role === UserRole.LANDLORD) return Promise.resolve();
        return this.tenantUsers.delete(event.payload.userId, context);
      }
      if (event.eventType === USER_DELETED_EVENT) {
        return this.tenantUsers.delete(event.payload.userId, context);
      }
      return this.onUserChanged(event, context);
    });
  }

  private async onUserChanged(
    event: UserRegisteredIntegrationEvent,
    context: TransactionContext,
  ): Promise<void> {
    const { userId, role, status } = event.payload;
    if (role !== UserRole.TENANT || status !== UserStatus.ACTIVE) {
      await this.tenantUsers.delete(userId, context);
      return;
    }

    const phone = TenantPhone.create(event.payload.phone.trim());
    await this.tenantUsers.lockPhone(phone, context);
    await this.tenantUsers.upsert(userId, phone, context);
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
    const contractById = new Map(
      contracts.map((contract) => [contract.id, contract]),
    );
    const events = linkedMembers.flatMap((member) => member.pullDomainEvents());
    for (const member of linkedMembers) {
      const contract = contractById.get(member.contractId);
      if (!contract || contract.landlordId === userId) continue;
      events.push(
        new ContractMemberNotificationRequestedEvent(
          member.id,
          [contract.landlordId],
          {
            messageKey: 'contract.member_linked',
            contractId: contract.id,
            contractCode: `HD-${contract.id.slice(0, 6)}`,
            memberName: member.tenantName!,
          },
        ),
      );
    }
    await this.outbox.append(
      events.map((domainEvent) => OutboxMessage.fromDomainEvent(domainEvent)),
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

  private assertUserLifecycleEvent(
    event: unknown,
  ): asserts event is UserLifecycleIntegrationEvent {
    if (
      !this.isRecord(event) ||
      typeof event.id !== 'string' ||
      !isValidUuid(event.id) ||
      ![
        USER_REGISTERED_EVENT,
        USER_UPDATED_EVENT,
        USER_DELETED_EVENT,
        USER_EMAIL_VERIFIED_EVENT,
        USER_LOCKED_EVENT,
        USER_UNLOCKED_EVENT,
      ].includes(event.eventType as string) ||
      event.routingKey !== event.eventType ||
      !this.isRecord(event.payload) ||
      typeof event.payload.userId !== 'string' ||
      !isValidUuid(event.payload.userId)
    ) {
      throw new ValidationException('Invalid user lifecycle integration event');
    }
    if (event.eventType === USER_UNLOCKED_EVENT) {
      if (
        event.payload.lockedAt !== undefined &&
        event.payload.lockedAt !== null &&
        (typeof event.payload.lockedAt !== 'string' ||
          !Number.isFinite(Date.parse(event.payload.lockedAt)) ||
          typeof event.occurredAt !== 'string' ||
          !Number.isFinite(Date.parse(event.occurredAt)) ||
          Date.parse(event.occurredAt) < Date.parse(event.payload.lockedAt))
      )
        throw new ValidationException(
          'Invalid user unlock lock-period evidence',
        );
      if (
        event.payload.status !== UserStatus.ACTIVE ||
        (event.payload.role !== undefined &&
          !Object.values(UserRole).includes(event.payload.role as UserRole)) ||
        (event.payload.phone !== undefined &&
          typeof event.payload.phone !== 'string')
      ) {
        throw new ValidationException(
          'Invalid user unlocked integration event',
        );
      }
      return;
    }
    if (event.eventType === USER_LOCKED_EVENT) {
      if (
        !Object.values(UserRole).includes(event.payload.role as UserRole) ||
        event.payload.status !== UserStatus.LOCKED ||
        typeof event.payload.lockedAt !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
          event.payload.lockedAt,
        ) ||
        !Number.isFinite(Date.parse(event.payload.lockedAt)) ||
        new Date(event.payload.lockedAt).toISOString() !==
          event.payload.lockedAt
      ) {
        throw new ValidationException('Invalid user locked integration event');
      }
      return;
    }
    if (
      event.eventType !== USER_DELETED_EVENT &&
      (typeof event.payload.phone !== 'string' ||
        !Object.values(UserRole).includes(event.payload.role as UserRole) ||
        !Object.values(UserStatus).includes(event.payload.status as UserStatus))
    ) {
      throw new ValidationException('Invalid user lifecycle integration event');
    }
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
