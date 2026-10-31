import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { OutboxModule } from 'modules/outbox/outbox.module';
import { RoomModule } from 'modules/room/room.module';
import { CONTRACT_DI_TOKEN } from './contract.di-token';
import { ContractTypeormEntity } from './infrastructure/persistence/contract.typeorm-entity';
import { TypeOrmContractRepository } from './infrastructure/persistence/contract.repository';
import { TypeOrmContractReadRepository } from './infrastructure/persistence/contract-read.repository';
import { ContractCreateCommandHandler } from './application/commands/contract-create/contract-create.command.handler';
import { ContractUpdateCommandHandler } from './application/commands/contract-update/contract-update.command.handler';
import { ContractGetByIdQueryHandler } from './application/queries/contract-get-by-id/contract-get-by-id.query.handler';
import { ContractListQueryHandler } from './application/queries/contract-list/contract-list.query.handler';
import { ContractController } from './presentation/http/controllers/contract.controller';

const commandHandlers = [
  ContractCreateCommandHandler,
  ContractUpdateCommandHandler,
];
const queryHandlers = [ContractGetByIdQueryHandler, ContractListQueryHandler];

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([ContractTypeormEntity]),
    RoomModule,
    OutboxModule,
  ],
  controllers: [ContractController],
  providers: [
    {
      provide: CONTRACT_DI_TOKEN.REPOSITORY,
      useClass: TypeOrmContractRepository,
    },
    {
      provide: CONTRACT_DI_TOKEN.READ_REPOSITORY,
      useClass: TypeOrmContractReadRepository,
    },
    ...commandHandlers,
    ...queryHandlers,
  ],
  exports: [CONTRACT_DI_TOKEN.REPOSITORY],
})
export class ContractModule {}
