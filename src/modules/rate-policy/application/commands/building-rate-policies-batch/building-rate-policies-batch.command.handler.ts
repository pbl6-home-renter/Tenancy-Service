import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BUILDING_DI_TOKEN } from 'modules/building/building.di-token';
import { BuildingRepository } from 'modules/building/domain/repositories/building.repository';
import { BuildingNotOwnedException } from 'modules/building/domain/exceptions/building-not-owned.exception';
import { OUTBOX_DI_TOKEN } from 'modules/outbox/outbox.di-token';
import { OutboxRepository } from 'modules/outbox/domain/repositories/outbox.repository';
import { OutboxMessage } from 'modules/outbox/domain/entities/outbox-message.entity';
import { UNIT_OF_WORK_DI_TOKEN } from 'shared/application/di-tokens';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { RatePolicyEntity } from '../../../domain/entities/rate-policy.entity';
import { RatePolicyScope } from '../../../domain/enums/rate-policy-scope.enum';
import { RatePolicyBuildingNotFoundException } from '../../../domain/exceptions/rate-policy-building-not-found.exception';
import { RatePolicyRepository } from '../../../domain/repositories/rate-policy.repository';
import { RATE_POLICY_DI_TOKEN } from '../../../rate-policy.di-token';
import { BuildingRatePoliciesBatchCommand } from './building-rate-policies-batch.command';

@CommandHandler(BuildingRatePoliciesBatchCommand)
export class BuildingRatePoliciesBatchCommandHandler implements ICommandHandler<
  BuildingRatePoliciesBatchCommand,
  RatePolicyEntity
> {
  constructor(
    @Inject(BUILDING_DI_TOKEN.REPOSITORY)
    private readonly buildings: BuildingRepository,
    @Inject(RATE_POLICY_DI_TOKEN.REPOSITORY)
    private readonly policies: RatePolicyRepository,
    @Inject(UNIT_OF_WORK_DI_TOKEN) private readonly unitOfWork: IUnitOfWork,
    @Inject(OUTBOX_DI_TOKEN.REPOSITORY)
    private readonly outbox: OutboxRepository,
  ) {}

  execute(
    command: BuildingRatePoliciesBatchCommand,
  ): Promise<RatePolicyEntity> {
    return this.unitOfWork.run(async (context) => {
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

      let policy = await this.policies.findByBuilding(
        command.buildingId,
        context,
      );
      if (policy) {
        policy.replaceRates(command.rates);
        policy.activate();
      } else {
        policy = RatePolicyEntity.create({
          landlordId: command.landlordId,
          scope: RatePolicyScope.BUILDING,
          buildingId: command.buildingId,
          roomId: null,
          rates: command.rates,
        });
      }
      await this.policies.save(policy, context);
      await this.outbox.append(
        policy
          .pullDomainEvents()
          .map((event) => OutboxMessage.fromDomainEvent(event)),
        context,
      );
      return policy;
    });
  }
}
