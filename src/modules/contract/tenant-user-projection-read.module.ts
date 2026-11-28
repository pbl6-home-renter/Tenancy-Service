import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CONTRACT_DI_TOKEN } from './contract.di-token';
import { TenantUserProjectionTypeormEntity } from './infrastructure/persistence/tenant-user-projection.typeorm-entity';
import { TypeOrmTenantUserProjectionRepository } from './infrastructure/persistence/tenant-user-projection.repository';

@Module({
  imports: [TypeOrmModule.forFeature([TenantUserProjectionTypeormEntity])],
  providers: [
    {
      provide: CONTRACT_DI_TOKEN.TENANT_USER_PROJECTION_READ,
      useClass: TypeOrmTenantUserProjectionRepository,
    },
  ],
  exports: [CONTRACT_DI_TOKEN.TENANT_USER_PROJECTION_READ],
})
export class TenantUserProjectionReadModule {}
