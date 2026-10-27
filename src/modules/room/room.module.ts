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

const commandHandlers = [
  RoomUpdateCommandHandler,
  RoomDeleteCommandHandler,
  RoomMarkReadyCommandHandler,
];
const queryHandlers = [RoomGetMyRoomsQueryHandler];

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([RoomTypeormEntity]),
    OutboxModule,
  ],
  controllers: [RoomController],
  providers: [
    {
      provide: ROOM_DI_TOKEN.REPOSITORY,
      useClass: TypeOrmRoomRepository,
    },
    ...commandHandlers,
    ...queryHandlers,
  ],
  exports: [ROOM_DI_TOKEN.REPOSITORY],
})
export class RoomModule {}
