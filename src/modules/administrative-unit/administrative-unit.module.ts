import { Module } from '@nestjs/common';
import { AdministrativeUnitService } from './application/administrative-unit.service';
import { ADMINISTRATIVE_UNIT_DI_TOKEN } from './administrative-unit.di-token';
import { AdministrativeUnitLocalCatalog } from './infrastructure/local/administrative-unit-local-catalog';
import { AdministrativeUnitController } from './presentation/http/controllers/administrative-unit.controller';

@Module({
  controllers: [AdministrativeUnitController],
  providers: [
    AdministrativeUnitService,
    {
      provide: ADMINISTRATIVE_UNIT_DI_TOKEN.CATALOG,
      useClass: AdministrativeUnitLocalCatalog,
    },
  ],
})
export class AdministrativeUnitModule {}
