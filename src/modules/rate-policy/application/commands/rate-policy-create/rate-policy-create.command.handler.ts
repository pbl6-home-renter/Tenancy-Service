import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { QueryFailedError } from 'typeorm';
import { BUILDING_DI_TOKEN } from 'modules/building/building.di-token';
import { BuildingRepository } from 'modules/building/domain/repositories/building.repository';
import { BuildingNotOwnedException } from 'modules/building/domain/exceptions/building-not-owned.exception';
import { ROOM_DI_TOKEN } from 'modules/room/room.di-token';
import { RoomRepository } from 'modules/room/domain/repositories/room.repository';
import { RoomNotFoundException } from 'modules/room/domain/exceptions/room-not-found.exception';
import { RoomNotOwnedException } from 'modules/room/domain/exceptions/room-not-owned.exception';
import { OUTBOX_DI_TOKEN } from 'modules/outbox/outbox.di-token';
import { OutboxRepository } from 'modules/outbox/domain/repositories/outbox.repository';
import { OutboxMessage } from 'modules/outbox/domain/entities/outbox-message.entity';
import { UNIT_OF_WORK_DI_TOKEN } from 'shared/application/di-tokens';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { PostgresErrorCode } from 'shared/infrastructure/database/postgres-error-code';
import { RatePolicyEntity } from '../../../domain/entities/rate-policy.entity';
import { RatePolicyScope } from '../../../domain/enums/rate-policy-scope.enum';
import { ActivePolicyExistsException } from '../../../domain/exceptions/active-policy-exists.exception';
import { RatePolicyBuildingNotFoundException } from '../../../domain/exceptions/rate-policy-building-not-found.exception';
import { RatePolicyRepository } from '../../../domain/repositories/rate-policy.repository';
import { RATE_POLICY_DI_TOKEN } from '../../../rate-policy.di-token';
import { RatePolicyCreateCommand } from './rate-policy-create.command';

@CommandHandler(RatePolicyCreateCommand)
export class RatePolicyCreateCommandHandler implements ICommandHandler<
  RatePolicyCreateCommand,
  RatePolicyEntity
> {
  constructor(
    @Inject(BUILDING_DI_TOKEN.REPOSITORY)
    private readonly buildings: BuildingRepository,
    @Inject(ROOM_DI_TOKEN.REPOSITORY) private readonly rooms: RoomRepository,
    @Inject(RATE_POLICY_DI_TOKEN.REPOSITORY)
    private readonly policies: RatePolicyRepository,
    @Inject(UNIT_OF_WORK_DI_TOKEN) private readonly unitOfWork: IUnitOfWork,
    @Inject(OUTBOX_DI_TOKEN.REPOSITORY)
    private readonly outbox: OutboxRepository,
  ) {}

  async execute(command: RatePolicyCreateCommand): Promise<RatePolicyEntity> {
    try {
      return await this.unitOfWork.run(async (context) => {
        let buildingId: Uuid;
        let roomId: Uuid | null = null;
        if (command.scope === RatePolicyScope.BUILDING) {
          if (!command.buildingId || command.roomId) {
            throw new ValidationException(
              'Building policy requires buildingId only',
            );
          }
          const building = await this.buildings.findByIdForUpdate(
            command.buildingId,
            context,
          );
          if (!building)
            throw new RatePolicyBuildingNotFoundException(command.buildingId);
          if (building.landlordId !== command.landlordId) {
            throw new BuildingNotOwnedException(
              command.buildingId,
              command.landlordId,
            );
          }
          buildingId = building.id;
          if (await this.policies.findByBuilding(buildingId, context))
            throw new ActivePolicyExistsException();
        } else if (command.scope === RatePolicyScope.ROOM) {
          if (!command.roomId || command.buildingId) {
            throw new ValidationException('Room policy requires roomId only');
          }
          const room = await this.rooms.findByIdForUpdate(
            command.roomId,
            context,
          );
          if (!room) throw new RoomNotFoundException(command.roomId);
          if (room.landlordId !== command.landlordId) {
            throw new RoomNotOwnedException(command.roomId, command.landlordId);
          }
          buildingId = room.buildingId;
          roomId = room.id;
          if (await this.policies.findByRoom(roomId, context))
            throw new ActivePolicyExistsException();
        } else {
          throw new ValidationException('Invalid rate policy scope');
        }
        const policy = RatePolicyEntity.create({
          landlordId: command.landlordId,
          scope: command.scope,
          buildingId,
          roomId,
          rates: command.rates,
        });
        await this.policies.save(policy, context);
        await this.outbox.append(
          policy
            .pullDomainEvents()
            .map((event) => OutboxMessage.fromDomainEvent(event)),
          context,
        );
        return policy;
      });
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string }).code ===
          PostgresErrorCode.UNIQUE_VIOLATION &&
        ['UQ_rate_policies_building', 'UQ_rate_policies_room'].includes(
          (error.driverError as { constraint?: string }).constraint ?? '',
        )
      ) {
        throw new ActivePolicyExistsException();
      }
      throw error;
    }
  }
}
