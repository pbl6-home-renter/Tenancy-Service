import { ContractTypeormEntity } from 'modules/contract/infrastructure/persistence/contract.entity';
import { TypeOrmRoomActiveContractChecker } from './infrastructure/persistence/room-active-contract-checker';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { OutboxModule } from 'modules/outbox/outbox.module';
import { RoomTypeormEntity } from './infrastructure/persistence/room.typeorm-entity';
import { TypeOrmRoomRepository } from './infrastructure/persistence/room.repository';
import { ROOM_DI_TOKEN } from './room.di-token';
import { RoomController } from './presentation/http/controllers/room.controller';
import { RoomGetMyRoomsQueryHandler } from './application/queries/room-get-my-rooms/room-get-my-rooms.query.handler';
import { RoomUpdateCommandHandler } from './application/commands/room-update/room-update.command.handler';
import { RoomDeleteCommandHandler } from './application/commands/room-delete/room-delete.command.handler';
import { RoomMarkReadyCommandHandler } from './application/commands/room-mark-ready/room-mark-ready.command.handler';
import { BuildingModule } from 'modules/building/building.module';
import { RoomCreateCommandHandler } from './application/commands/room-create/room-create.command.handler';
import { TypeOrmRoomReadRepository } from './infrastructure/persistence/room-read.repository';
import { RoomPublicSearchQueryHandler } from './application/queries/room-public-search/room-public-search.query.handler';
import { RoomGetDetailQueryHandler } from './application/queries/room-get-detail/room-get-detail.query.handler';
import { InternalHttpModule } from 'shared/infrastructure/http/internal-http.module';
import { MEDIA_LOOKUP_PORT } from 'modules/media/application/ports/media-lookup.port';
import { IdentityMediaLookupService } from 'modules/media/infrastructure/services/identity-media-lookup.service';

const commandHandlers = [
  RoomCreateCommandHandler,
  RoomUpdateCommandHandler,
  RoomDeleteCommandHandler,
  RoomMarkReadyCommandHandler,
];
const queryHandlers = [
  RoomGetMyRoomsQueryHandler,
  RoomPublicSearchQueryHandler,
  RoomGetDetailQueryHandler,
];

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([RoomTypeormEntity, ContractTypeormEntity]),
    BuildingModule,
    OutboxModule,
    InternalHttpModule,
  ],
  controllers: [RoomController],
  providers: [
    {
      provide: ROOM_DI_TOKEN.REPOSITORY,
      useClass: TypeOrmRoomRepository,
    },
    {
      provide: ROOM_DI_TOKEN.READ_REPOSITORY,
      useClass: TypeOrmRoomReadRepository,
    },
    {
      provide: ROOM_DI_TOKEN.ACTIVE_CONTRACT_CHECKER,
      useClass: TypeOrmRoomActiveContractChecker,
    },
    { provide: MEDIA_LOOKUP_PORT, useClass: IdentityMediaLookupService },
    ...commandHandlers,
    ...queryHandlers,
  ],
  exports: [ROOM_DI_TOKEN.REPOSITORY],
})
export class RoomModule {}
