import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BUILDING_DI_TOKEN } from './building.di-token';
import { TypeOrmBuildingRepository } from './infrastructure/persistence/building.repository';
import { BuildingTypeormEntity } from './infrastructure/persistence/building.typeorm-entity';

@Module({
  imports: [TypeOrmModule.forFeature([BuildingTypeormEntity])],
  providers: [
    {
      provide: BUILDING_DI_TOKEN.REPOSITORY,
      useClass: TypeOrmBuildingRepository,
    },
  ],
  exports: [BUILDING_DI_TOKEN.REPOSITORY],
})
export class BuildingModule {}
