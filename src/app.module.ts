import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { LoggingExceptionFilter } from 'shared/presentation/http/filters/error-handling-exception.filter';
import { ResponseTransformInterceptor } from 'shared/presentation/http/interceptors/response-transform.interceptor';
import { SharedModule } from 'shared/shared.module';
import { SecurityModule } from 'shared/security.module';
import { SampleModule } from 'modules/sample/sample.module';
import { HealthModule } from 'modules/health/health.module';
import { OutboxModule } from 'modules/outbox/outbox.module';
import { BuildingModule } from 'modules/building/building.module';
import { RoomModule } from 'modules/room/room.module';
import { AdministrativeUnitModule } from 'modules/administrative-unit/administrative-unit.module';

@Module({
  imports: [
    SharedModule,
    SecurityModule,
    SampleModule,
    RoomModule,
    OutboxModule,
    HealthModule,
    BuildingModule,
    AdministrativeUnitModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: LoggingExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseTransformInterceptor,
    },
  ],
})
export class AppModule {}
