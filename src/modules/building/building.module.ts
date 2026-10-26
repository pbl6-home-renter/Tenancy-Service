import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BUILDING_DI_TOKEN } from './building.di-token';
import { TrackAsiaGeocodingAdapter } from './infrastructure/geocoding/trackasia-geocoding.adapter';
import { TypeOrmBuildingRepository } from './infrastructure/persistence/building.repository';
import { BuildingTypeormEntity } from './infrastructure/persistence/building.typeorm-entity';

@Module({
  imports: [TypeOrmModule.forFeature([BuildingTypeormEntity]), HttpModule],
  providers: [
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
