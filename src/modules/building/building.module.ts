import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { OutboxModule } from 'modules/outbox/outbox.module';
import { InternalHttpModule } from 'shared/infrastructure/http/internal-http.module';
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
import { BuildingApproveCommandHandler } from './application/commands/building-approve/building-approve.command.handler';
import { BuildingRejectCommandHandler } from './application/commands/building-reject/building-reject.command.handler';
import { BuildingListForAdminQueryHandler } from './application/queries/building-list-for-admin/building-list-for-admin.query.handler';
import { BuildingGetAdminQueryHandler } from './application/queries/building-get-admin/building-get-admin.query.handler';
import { AdminBuildingController } from './presentation/http/controllers/admin-building.controller';
import { InternalUserService } from './infrastructure/services/internal-user.service';
import { BuildingSearchPublicQueryHandler } from './application/queries/building-search-public/building-search-public.query.handler';
import { BuildingGetPublicQueryHandler } from './application/queries/building-get-public/building-get-public.query.handler';

const commandHandlers = [
  BuildingApproveCommandHandler,
  BuildingRejectCommandHandler,
  BuildingCreateCommandHandler,
  BuildingUpdateCommandHandler,
  BuildingDeleteCommandHandler,
];
const queryHandlers = [
  BuildingSearchPublicQueryHandler,
  BuildingGetPublicQueryHandler,
  BuildingListForAdminQueryHandler,
  BuildingGetAdminQueryHandler,
  BuildingListMineQueryHandler,
  BuildingGetMineQueryHandler,
];

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([BuildingTypeormEntity]),
    HttpModule,
    InternalHttpModule,
    OutboxModule,
  ],
  controllers: [
    BuildingController,
    MyBuildingController,
    AdminBuildingController,
  ],
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
    {
      provide: BUILDING_DI_TOKEN.INTERNAL_USER,
      useClass: InternalUserService,
    },
  ],
  exports: [BUILDING_DI_TOKEN.REPOSITORY, BUILDING_DI_TOKEN.GEOCODING],
})
export class BuildingModule {}
