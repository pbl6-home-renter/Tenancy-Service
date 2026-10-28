import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { OutboxModule } from 'modules/outbox/outbox.module';
import { BuildingCreateCommandHandler } from './application/commands/building-create/building-create.command.handler';
import { BuildingUpdateCommandHandler } from './application/commands/building-update/building-update.command.handler';
import { BuildingDeleteCommandHandler } from './application/commands/building-delete/building-delete.command.handler';
import { BuildingListMineQueryHandler } from './application/queries/building-list-mine/building-list-mine.query.handler';
import { BuildingGetMineQueryHandler } from './application/queries/building-get-mine/building-get-mine.query.handler';
import { BuildingController } from './presentation/http/controllers/building.controller';
import { MyBuildingController } from './presentation/http/controllers/my-building.controller';
import { BUILDING_DI_TOKEN } from './building.di-token';
import { TrackAsiaGeocodingAdapter } from './infrastructure/geocoding/trackasia-geocoding.adapter';
import { TypeOrmBuildingRepository } from './infrastructure/persistence/building.repository';
import { BuildingTypeormEntity } from './infrastructure/persistence/building.typeorm-entity';

const commandHandlers = [
  BuildingCreateCommandHandler,
  BuildingUpdateCommandHandler,
  BuildingDeleteCommandHandler,
];
const queryHandlers = [
  BuildingListMineQueryHandler,
  BuildingGetMineQueryHandler,
];

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([BuildingTypeormEntity]),
    HttpModule,
    OutboxModule,
  ],
  controllers: [BuildingController, MyBuildingController],
  providers: [
    ...commandHandlers,
    ...queryHandlers,
    {
      provide: BUILDING_DI_TOKEN.REPOSITORY,
      useClass: TypeOrmBuildingRepository,
    },
    {
      provide: BUILDING_DI_TOKEN.GEOCODING,
      useClass: TrackAsiaGeocodingAdapter,
    },
  ],
  exports: [BUILDING_DI_TOKEN.REPOSITORY, BUILDING_DI_TOKEN.GEOCODING],
})
export class BuildingModule {}
