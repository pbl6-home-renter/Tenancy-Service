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
import { isValidUuid, Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ConsumerRegistry } from 'shared/infrastructure/messaging/rabbitmq/consumer/consumer-registry';
import { CONTRACT_DI_TOKEN } from '../../contract.di-token';
import { TenantUserProjectionPort } from '../../application/ports/tenant-user-projection.port';
import { LandlordLockCycleEntity } from '../../domain/entities/landlord-lock-cycle.entity';
import { ContractStatus } from '../../domain/enums/contract-status.enum';
import { LandlordLockCycleRepository } from '../../domain/repositories/landlord-lock-cycle.repository';
import { ContractMemberRepository } from '../../domain/repositories/contract-member.repository';
import { ContractRepository } from '../../domain/repositories/contract.repository';
import { TenantPhone } from '../../domain/value-objects/tenant-phone.vo';
import {
  UserLifecycleIntegrationEvent,
  UserLockedIntegrationEvent,
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
    @Inject(CONTRACT_DI_TOKEN.LANDLORD_LOCK_CYCLE)
    private readonly cycles: LandlordLockCycleRepository,
    @Inject(CONTRACT_DI_TOKEN.LANDLORD_LOCK_GRACE_PERIOD_MS)
    private readonly gracePeriodMs: number,
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
      // P9-07 owns contract unlock decisions; only refresh tenant lookup here.
      if (event.eventType === USER_UNLOCKED_EVENT) {
        const { role, phone } = event.payload;
        // Older producers did not include the tenant lookup snapshot.
        if (role === undefined || phone === undefined) return Promise.resolve();
        return this.onUserChanged(
          { ...event, payload: { ...event.payload, role, phone } },
          context,
        );
      }
      if (event.eventType === USER_LOCKED_EVENT) {
        return this.onUserLocked(event, context);
      }
      if (event.eventType === USER_DELETED_EVENT) {
        return this.tenantUsers.delete(event.payload.userId, context);
      }
      return this.onUserChanged(event, context);
    });
  }

  private async onUserLocked(
    event: UserLockedIntegrationEvent,
    context: TransactionContext,
  ): Promise<void> {
    if (event.payload.role !== UserRole.LANDLORD) {
      await this.tenantUsers.delete(event.payload.userId, context);
      return;
    }

    const id = event.id;
    const landlordId = event.payload.userId;
    const lockedAt = new Date(event.payload.lockedAt);
    await this.cycles.lockLandlord(landlordId, context);
    const previous = await this.cycles.findLatestForUpdate(landlordId, context);
    // A new envelope for the same lock and a delayed older lock are both no-ops.
    if (previous && previous.lockedAt >= lockedAt) return;

    // Carry unresolved suspensions forward so superseding a cycle cannot orphan them.
    const contracts = await this.contracts.findForLandlordLockForUpdate(
      landlordId,
      previous?.contractIds ?? [],
      context,
    );
    const cycle = LandlordLockCycleEntity.create({
      id,
      landlordId,
      lockedAt,
      gracePeriodMs: this.gracePeriodMs,
      contractIds: contracts.map((contract) => contract.id),
    });
    if (previous) {
      previous.supersede();
      await this.cycles.save(previous, context);
    }
    await this.cycles.save(cycle, context);

    // Keep each recipient's snapshot limited to their own contracts.
    const recipientContracts = new Map<Uuid, Uuid[]>();
    for (const contract of contracts) {
      if (contract.status !== ContractStatus.ACTIVE) continue;
      contract.suspend();
      await this.contracts.save(contract, context);
      const members = await this.members.findActiveByContract(
        contract.id,
        context,
      );
      const recipients = new Set([
        landlordId,
        ...(contract.tenantId ? [contract.tenantId] : []),
        ...members.flatMap((member) =>
          member.tenantId ? [member.tenantId] : [],
        ),
      ]);
      for (const recipient of recipients) {
        const ids = recipientContracts.get(recipient) ?? [];
        ids.push(contract.id);
        recipientContracts.set(recipient, ids);
      }
    }
    for (const [recipient, contractIds] of recipientContracts) {
      cycle.requestSuspensionNotification(recipient, contractIds);
    }
    await this.outbox.append(
      cycle
        .pullDomainEvents()
        .map((event) => OutboxMessage.fromDomainEvent(event)),
      context,
    );
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
