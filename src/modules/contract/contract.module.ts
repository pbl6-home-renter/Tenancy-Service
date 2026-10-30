import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CONTRACT_DI_TOKEN } from './contract.di-token';
import { ContractTypeormEntity } from './infrastructure/persistence/contract.typeorm-entity';
import { TypeOrmContractRepository } from './infrastructure/persistence/contract.repository';

@Module({
  imports: [TypeOrmModule.forFeature([ContractTypeormEntity])],
  providers: [
    {
      provide: CONTRACT_DI_TOKEN.REPOSITORY,
      useClass: TypeOrmContractRepository,
    },
  ],
  exports: [CONTRACT_DI_TOKEN.REPOSITORY],
})
export class ContractModule {}
