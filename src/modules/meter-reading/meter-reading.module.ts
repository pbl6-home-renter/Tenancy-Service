import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OutboxModule } from 'modules/outbox/outbox.module';
import { RoomModule } from 'modules/room/room.module';
import { MeterReadingCreateCommandHandler } from './application/commands/meter-reading-create/meter-reading-create.command.handler';
import { MeterReadingListQueryHandler } from './application/queries/meter-reading-list/meter-reading-list.query.handler';
import { TypeOrmMeterReadingRepository } from './infrastructure/persistence/meter-reading.repository';
import { MeterReadingTypeormEntity } from './infrastructure/persistence/meter-reading.typeorm-entity';
import { METER_READING_DI_TOKEN } from './meter-reading.di-token';
import { MeterReadingController } from './presentation/http/controllers/meter-reading.controller';

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([MeterReadingTypeormEntity]),
    RoomModule,
    OutboxModule,
  ],
  controllers: [MeterReadingController],
  providers: [
    MeterReadingCreateCommandHandler,
    MeterReadingListQueryHandler,
    TypeOrmMeterReadingRepository,
    {
      provide: METER_READING_DI_TOKEN.REPOSITORY,
      useExisting: TypeOrmMeterReadingRepository,
    },
    {
      provide: METER_READING_DI_TOKEN.PAGE_QUERY,
      useExisting: TypeOrmMeterReadingRepository,
    },
  ],
  exports: [
    METER_READING_DI_TOKEN.REPOSITORY,
    METER_READING_DI_TOKEN.PAGE_QUERY,
  ],
})
export class MeterReadingModule {}
