import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeOrmRatePolicyRepository } from './infrastructure/persistence/rate-policy.repository';
import { RatePolicyTypeormEntity } from './infrastructure/persistence/rate-policy.typeorm-entity';
import { RATE_POLICY_DI_TOKEN } from './rate-policy.di-token';

@Module({
  imports: [TypeOrmModule.forFeature([RatePolicyTypeormEntity])],
  providers: [
    TypeOrmRatePolicyRepository,
    {
      provide: RATE_POLICY_DI_TOKEN.REPOSITORY,
      useExisting: TypeOrmRatePolicyRepository,
    },
    {
      provide: RATE_POLICY_DI_TOKEN.PAGE_QUERY,
      useExisting: TypeOrmRatePolicyRepository,
    },
  ],
  exports: [RATE_POLICY_DI_TOKEN.REPOSITORY, RATE_POLICY_DI_TOKEN.PAGE_QUERY],
})
export class RatePolicyModule {}
