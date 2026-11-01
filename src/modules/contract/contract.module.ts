import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { InternalHttpModule } from 'shared/infrastructure/http/internal-http.module';
import { OutboxModule } from 'modules/outbox/outbox.module';
import { RoomModule } from 'modules/room/room.module';
import { CONTRACT_DI_TOKEN } from './contract.di-token';
import { ContractTypeormEntity } from './infrastructure/persistence/contract.entity';
import { TypeOrmContractRepository } from './infrastructure/persistence/contract.repository';
import { TypeOrmContractReadRepository } from './infrastructure/persistence/contract-read.repository';
import { ContractActivateCommandHandler } from './application/commands/contract-activate/contract-activate.command.handler';
import { ContractCreateCommandHandler } from './application/commands/contract-create/contract-create.command.handler';
import { ContractUpdateCommandHandler } from './application/commands/contract-update/contract-update.command.handler';
import { ContractGetByIdQueryHandler } from './application/queries/contract-get-by-id/contract-get-by-id.query.handler';
import { ContractListQueryHandler } from './application/queries/contract-list/contract-list.query.handler';
import { ContractController } from './presentation/http/controllers/contract.controller';
import { ContractTemplateTypeormEntity } from './infrastructure/persistence/contract-template.entity';
import { TypeOrmContractTemplateRepository } from './infrastructure/persistence/contract-template.repository';
import { PdfContractDocumentRenderer } from './infrastructure/document/pdf-contract-document.renderer';
import { IdentityMediaLookupAdapter } from './infrastructure/media/identity-media-lookup.adapter';
import { ContractTemplateListQueryHandler } from './application/queries/contract-template-list/contract-template-list.query.handler';
import { ContractTemplateGetQueryHandler } from './application/queries/contract-template-get/contract-template-get.query.handler';
import { ContractTemplateController } from './presentation/http/controllers/contract-template.controller';

const commandHandlers = [
  ContractCreateCommandHandler,
  ContractUpdateCommandHandler,
  ContractActivateCommandHandler,
];
const queryHandlers = [
  ContractGetByIdQueryHandler,
  ContractListQueryHandler,
  ContractTemplateListQueryHandler,
  ContractTemplateGetQueryHandler,
];

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([
      ContractTypeormEntity,
      ContractTemplateTypeormEntity,
    ]),
    RoomModule,
    OutboxModule,
    InternalHttpModule,
  ],
  controllers: [ContractController, ContractTemplateController],
  providers: [
    {
      provide: CONTRACT_DI_TOKEN.REPOSITORY,
      useClass: TypeOrmContractRepository,
    },
    {
      provide: CONTRACT_DI_TOKEN.READ_REPOSITORY,
      useClass: TypeOrmContractReadRepository,
    },
    {
      provide: CONTRACT_DI_TOKEN.TEMPLATE_REPOSITORY,
      useClass: TypeOrmContractTemplateRepository,
    },
    {
      provide: CONTRACT_DI_TOKEN.DOCUMENT_RENDERER,
      useClass: PdfContractDocumentRenderer,
    },
    {
      provide: CONTRACT_DI_TOKEN.MEDIA_LOOKUP,
      useClass: IdentityMediaLookupAdapter,
    },
    ...commandHandlers,
    ...queryHandlers,
  ],
  exports: [CONTRACT_DI_TOKEN.REPOSITORY],
})
export class ContractModule {}
