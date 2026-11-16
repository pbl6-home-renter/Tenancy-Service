import { Inject, Injectable } from '@nestjs/common';
import { OUTBOX_DI_TOKEN } from 'modules/outbox/outbox.di-token';
import { OutboxRepository } from 'modules/outbox/domain/repositories/outbox.repository';
import { OutboxMessage } from 'modules/outbox/domain/entities/outbox-message.entity';
import { ROOMMATE_PROFILE_DI_TOKEN } from 'modules/roommate-profile/roommate-profile.di-token';
import {
  TenantDirectoryPort,
  TenantSummary,
} from 'modules/roommate-profile/application/ports/tenant-directory.port';
import { RoommateProfileReadPort } from 'modules/roommate-profile/application/ports/roommate-profile-read.port';
import { RoommateProfileNotFoundException } from 'modules/roommate-profile/domain/exceptions/roommate-profile-not-found.exception';
import { RoommateTenantInactiveException } from 'modules/roommate-profile/domain/exceptions/roommate-tenant-inactive.exception';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { UNIT_OF_WORK_DI_TOKEN } from 'shared/application/di-tokens';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { MatchRequestEntity } from '../domain/entities/match-request.entity';
import { MatchRequestStatus } from '../domain/enums/match-request-status.enum';
import { MatchRequestIdempotencyKeyReusedException } from '../domain/exceptions/match-request-idempotency-key-reused.exception';
import { MatchRequestNotFoundException } from '../domain/exceptions/match-request-not-found.exception';
import { MatchRequestRepository } from '../domain/repositories/match-request.repository';
import { MATCH_REQUEST_DI_TOKEN } from '../match-request.di-token';
import { MatchRequestPageQueryPort } from './ports/match-request-page-query.port';

@Injectable()
export class MatchRequestService {
  constructor(
    @Inject(MATCH_REQUEST_DI_TOKEN.REPOSITORY)
    private readonly requests: MatchRequestRepository,
    @Inject(MATCH_REQUEST_DI_TOKEN.PAGE_QUERY)
    private readonly pages: MatchRequestPageQueryPort,
    @Inject(ROOMMATE_PROFILE_DI_TOKEN.READ_REPOSITORY)
    private readonly profiles: RoommateProfileReadPort,
    @Inject(ROOMMATE_PROFILE_DI_TOKEN.TENANT_DIRECTORY)
    private readonly tenants: TenantDirectoryPort,
    @Inject(UNIT_OF_WORK_DI_TOKEN) private readonly unitOfWork: IUnitOfWork,
    @Inject(OUTBOX_DI_TOKEN.REPOSITORY)
    private readonly outbox: OutboxRepository,
  ) {}

  async create(
    requesterId: Uuid,
    targetId: Uuid,
    key: Uuid,
  ): Promise<MatchRequestEntity> {
    const actor = await this.requireActiveTenant(requesterId);
    const replay = await this.requests.findByRequestKey(requesterId, key);
    if (replay) {
      if (replay.targetId.toLowerCase() !== targetId.toLowerCase())
        throw new MatchRequestIdempotencyKeyReusedException();
      return replay;
    }
    const request = MatchRequestEntity.create(requesterId, targetId, key);
    return this.unitOfWork.run(async (context) => {
      const saved = await this.requests.insertOrFind(request, context);
      if (!saved.created) return saved.request;
      if (
        !(await this.tenants.findActive([targetId])).has(targetId.toLowerCase())
      ) {
        throw new RoommateProfileNotFoundException();
      }
      const profile = await this.profiles.findDiscoverableByTenantId(
        targetId,
        context,
      );
      if (!profile) throw new RoommateProfileNotFoundException();
      await this.outbox.append(
        request
          .pullDomainEvents()
          .map((event) =>
            OutboxMessage.fromDomainEvent({
              ...event,
              payload: { ...event.payload, actorDisplayName: actor.name },
            }),
          ),
        context,
      );
      return saved.request;
    });
  }

  async transition(
    actorId: Uuid,
    id: Uuid,
    next: MatchRequestStatus,
  ): Promise<MatchRequestEntity> {
    const actor = await this.requireActiveTenant(actorId);
    return this.unitOfWork.run(async (context) => {
      const request = await this.requests.findByIdForUpdate(id, context);
      if (!request) throw new MatchRequestNotFoundException();
      if (request.transition(actorId, next)) {
        await this.requests.save(request, context);
        await this.outbox.append(
          request
            .pullDomainEvents()
            .map((event) =>
              OutboxMessage.fromDomainEvent({
                ...event,
                payload: { ...event.payload, actorDisplayName: actor.name },
              }),
            ),
          context,
        );
      }
      return request;
    });
  }

  async list(
    actorId: Uuid,
    options: {
      pageNo: number;
      pageSize: number;
      direction?: 'incoming' | 'outgoing';
      status?: MatchRequestStatus;
    },
  ): Promise<PaginatedResult<MatchRequestEntity>> {
    await this.requireActiveTenant(actorId);
    return this.pages.findPage(actorId, options);
  }

  private async requireActiveTenant(id: Uuid): Promise<TenantSummary> {
    const actor = (await this.tenants.findActive([id])).get(id.toLowerCase());
    if (!actor) throw new RoommateTenantInactiveException();
    return actor;
  }
}
