import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { BuildingModule } from 'modules/building/building.module';
import { RoomModule } from 'modules/room/room.module';
import { OutboxModule } from 'modules/outbox/outbox.module';
import { BuildingRatePoliciesBatchCommandHandler } from './application/commands/building-rate-policies-batch/building-rate-policies-batch.command.handler';
import { RatePolicyCreateCommandHandler } from './application/commands/rate-policy-create/rate-policy-create.command.handler';
import { RatePolicyUpdateCommandHandler } from './application/commands/rate-policy-update/rate-policy-update.command.handler';
import { RatePolicyDeactivateCommandHandler } from './application/commands/rate-policy-deactivate/rate-policy-deactivate.command.handler';
import { RatePolicyListQueryHandler } from './application/queries/rate-policy-list/rate-policy-list.query.handler';
import { RatePolicyController } from './presentation/http/controllers/rate-policy.controller';
import { BuildingRatePolicyController } from './presentation/http/controllers/building-rate-policy.controller';
import { TypeOrmRatePolicyRepository } from './infrastructure/persistence/rate-policy.repository';
import { RatePolicyTypeormEntity } from './infrastructure/persistence/rate-policy.typeorm-entity';
import { RATE_POLICY_DI_TOKEN } from './rate-policy.di-token';

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([RatePolicyTypeormEntity]),
    BuildingModule,
    RoomModule,
    OutboxModule,
  ],
  controllers: [RatePolicyController, BuildingRatePolicyController],
  providers: [
    BuildingRatePoliciesBatchCommandHandler,
    RatePolicyCreateCommandHandler,
    RatePolicyUpdateCommandHandler,
    RatePolicyDeactivateCommandHandler,
    RatePolicyListQueryHandler,
    TypeOrmRatePolicyRepository,
    {
      provide: RATE_POLICY_DI_TOKEN.REPOSITORY,
      useExisting: TypeOrmRatePolicyRepository,
    },
    {
      provide: RATE_POLICY_DI_TOKEN.PAGE_QUERY,
      useExisting: TypeOrmRatePolicyRepository,
    },
  ],
  exports: [RATE_POLICY_DI_TOKEN.REPOSITORY, RATE_POLICY_DI_TOKEN.PAGE_QUERY],
})
export class RatePolicyModule {}
