import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BuildingTypeormEntity } from 'modules/building/infrastructure/persistence/building.typeorm-entity';
import { RoomTypeormEntity } from 'modules/room/infrastructure/persistence/room.typeorm-entity';
import { AdminDashboardQueryHandler } from './application/queries/admin-dashboard/admin-dashboard.query.handler';
import { DASHBOARD_READER } from './dashboard.di-token';
import { TypeOrmDashboardReader } from './infrastructure/persistence/dashboard.reader';
import { DashboardController } from './presentation/http/controllers/dashboard.controller';

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([BuildingTypeormEntity, RoomTypeormEntity]),
  ],
  controllers: [DashboardController],
  providers: [
    AdminDashboardQueryHandler,
    { provide: DASHBOARD_READER, useClass: TypeOrmDashboardReader },
  ],
})
export class DashboardModule {}
