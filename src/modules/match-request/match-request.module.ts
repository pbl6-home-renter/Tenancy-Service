import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OutboxModule } from 'modules/outbox/outbox.module';
import { RoommateProfileModule } from 'modules/roommate-profile/roommate-profile.module';
import { MatchRequestService } from './application/match-request.service';
import { MatchRequestCreateCommandHandler } from './application/commands/match-request-create/match-request-create.command.handler';
import { MatchRequestTransitionCommandHandler } from './application/commands/match-request-transition/match-request-transition.command.handler';
import { MatchRequestListQueryHandler } from './application/queries/match-request-list/match-request-list.query.handler';
import { TypeOrmMatchRequestRepository } from './infrastructure/persistence/match-request.repository';
import { MatchRequestTypeormEntity } from './infrastructure/persistence/match-request.typeorm-entity';
import { MATCH_REQUEST_DI_TOKEN } from './match-request.di-token';
import { MatchRequestController } from './presentation/http/controllers/match-request.controller';

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([MatchRequestTypeormEntity]),
    RoommateProfileModule,
    OutboxModule,
  ],
  controllers: [MatchRequestController],
  providers: [
    MatchRequestService,
    MatchRequestCreateCommandHandler,
    MatchRequestTransitionCommandHandler,
    MatchRequestListQueryHandler,
    TypeOrmMatchRequestRepository,
    {
      provide: MATCH_REQUEST_DI_TOKEN.REPOSITORY,
      useExisting: TypeOrmMatchRequestRepository,
    },
    {
      provide: MATCH_REQUEST_DI_TOKEN.PAGE_QUERY,
      useExisting: TypeOrmMatchRequestRepository,
    },
  ],
})
export class MatchRequestModule {}
