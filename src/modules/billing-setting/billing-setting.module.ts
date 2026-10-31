import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BuildingModule } from 'modules/building/building.module';
import { RoomModule } from 'modules/room/room.module';
import { OutboxModule } from 'modules/outbox/outbox.module';
import { BillingSettingCreateCommandHandler } from './application/commands/billing-setting-create/billing-setting-create.command.handler';
import { BillingSettingUpdateCommandHandler } from './application/commands/billing-setting-update/billing-setting-update.command.handler';
import { BillingSettingListQueryHandler } from './application/queries/billing-setting-list/billing-setting-list.query.handler';
import { BillingSettingTypeormEntity } from './infrastructure/persistence/billing-setting.typeorm-entity';
import { TypeOrmBillingSettingRepository } from './infrastructure/persistence/billing-setting.repository';
import { BillingSettingController } from './presentation/http/controllers/billing-setting.controller';
import { BILLING_SETTING_DI_TOKEN } from './billing-setting.di-token';

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([BillingSettingTypeormEntity]),
    BuildingModule,
    RoomModule,
    OutboxModule,
  ],
  controllers: [BillingSettingController],
  providers: [
    BillingSettingCreateCommandHandler,
    BillingSettingUpdateCommandHandler,
    BillingSettingListQueryHandler,
    TypeOrmBillingSettingRepository,
    {
      provide: BILLING_SETTING_DI_TOKEN.REPOSITORY,
      useExisting: TypeOrmBillingSettingRepository,
    },
    {
      provide: BILLING_SETTING_DI_TOKEN.PAGE_QUERY,
      useExisting: TypeOrmBillingSettingRepository,
    },
  ],
  exports: [
    BILLING_SETTING_DI_TOKEN.REPOSITORY,
    BILLING_SETTING_DI_TOKEN.PAGE_QUERY,
  ],
})
export class BillingSettingModule {}
