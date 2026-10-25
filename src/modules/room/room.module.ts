import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoomTypeormEntity } from './infrastructure/persistence/room.typeorm-entity';
import { TypeOrmRoomRepository } from './infrastructure/persistence/room.repository';
import { ROOM_DI_TOKEN } from './room.di-token';

@Module({
  imports: [TypeOrmModule.forFeature([RoomTypeormEntity])],
  providers: [
    {
      provide: ROOM_DI_TOKEN.REPOSITORY,
      useClass: TypeOrmRoomRepository,
    },
  ],
  exports: [ROOM_DI_TOKEN.REPOSITORY],
})
export class RoomModule {}
