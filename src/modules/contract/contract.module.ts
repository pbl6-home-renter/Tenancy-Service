import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { InternalHttpModule } from 'shared/infrastructure/http/internal-http.module';
import { OutboxModule } from 'modules/outbox/outbox.module';
import { InboxModule } from 'modules/inbox/inbox.module';
import { IdentityLifecycleSubscriber } from './presentation/messaging/identity-lifecycle.subscriber';
import { TenantUserProjectionTypeormEntity } from './infrastructure/persistence/tenant-user-projection.typeorm-entity';
import { TypeOrmTenantUserProjectionRepository } from './infrastructure/persistence/tenant-user-projection.repository';
import { RoomModule } from 'modules/room/room.module';
import { BuildingModule } from 'modules/building/building.module';
import { BillingSettingModule } from 'modules/billing-setting/billing-setting.module';
import { ContractDraftDocumentGenerateQueryHandler } from './application/queries/contract-draft-document-generate/contract-draft-document-generate.query.handler';
import { CONTRACT_DI_TOKEN } from './contract.di-token';
import { ContractTypeormEntity } from './infrastructure/persistence/contract.entity';
import { TypeOrmContractRepository } from './infrastructure/persistence/contract.repository';
import { TypeOrmContractReadRepository } from './infrastructure/persistence/contract-read.repository';
import { ContractActivateCommandHandler } from './application/commands/contract-activate/contract-activate.command.handler';
import { ContractCreateCommandHandler } from './application/commands/contract-create/contract-create.command.handler';
import { ContractUpdateCommandHandler } from './application/commands/contract-update/contract-update.command.handler';
import { ContractTemplateApplyCommandHandler } from './application/commands/contract-template-apply/contract-template-apply.command.handler';
import { ContractGetByIdQueryHandler } from './application/queries/contract-get-by-id/contract-get-by-id.query.handler';
import { ContractListQueryHandler } from './application/queries/contract-list/contract-list.query.handler';
import { ContractController } from './presentation/http/controllers/contract.controller';
import { ContractTemplateTypeormEntity } from './infrastructure/persistence/contract-template.entity';
import { TypeOrmContractTemplateRepository } from './infrastructure/persistence/contract-template.repository';
import { PdfContractDocumentRenderer } from './infrastructure/document/pdf-contract-document.renderer';
import { IdentityMediaLookupAdapter } from './infrastructure/media/identity-media-lookup.adapter';
import { IdentityUserAvatarLookupAdapter } from './infrastructure/users/identity-user-avatar-lookup.adapter';
import { UserAvatarLookupQueryHandler } from './application/queries/user-avatar-lookup/user-avatar-lookup.query.handler';
import { ContractTemplateListQueryHandler } from './application/queries/contract-template-list/contract-template-list.query.handler';
import { ContractTemplateGetQueryHandler } from './application/queries/contract-template-get/contract-template-get.query.handler';
import { ContractTemplateController } from './presentation/http/controllers/contract-template.controller';
import { ContractMemberTypeormEntity } from './infrastructure/persistence/contract-member.entity';
import { TypeOrmContractMemberRepository } from './infrastructure/persistence/contract-member.repository';
import { ContractMemberController } from './presentation/http/controllers/contract-member.controller';
import { ContractMemberListQueryHandler } from './application/queries/contract-member-list/contract-member-list.query.handler';
import { ContractMemberAddCommandHandler } from './application/commands/contract-member-add/contract-member-add.command.handler';
import { ContractMemberUpdateCommandHandler } from './application/commands/contract-member-update/contract-member-update.command.handler';
import { ContractMemberLeaveCommandHandler } from './application/commands/contract-member-leave/contract-member-leave.command.handler';
import { ContractMyListQueryHandler } from './application/queries/contract-my-list/contract-my-list.query.handler';
import { ContractMyController } from './presentation/http/controllers/contract-my.controller';
import { ContractCheckoutCompleteCommandHandler } from './application/commands/contract-checkout-complete/contract-checkout-complete.command.handler';
import { ContractSettlementAdapter } from './infrastructure/persistence/contract-settlement.adapter';

const commandHandlers = [
  ContractTemplateApplyCommandHandler,
  ContractCheckoutCompleteCommandHandler,
  ContractMemberAddCommandHandler,
  ContractMemberUpdateCommandHandler,
  ContractMemberLeaveCommandHandler,
  ContractCreateCommandHandler,
  ContractUpdateCommandHandler,
  ContractActivateCommandHandler,
];
const queryHandlers = [
  ContractDraftDocumentGenerateQueryHandler,
  ContractMyListQueryHandler,
  ContractMemberListQueryHandler,
  UserAvatarLookupQueryHandler,
  ContractGetByIdQueryHandler,
  ContractListQueryHandler,
  ContractTemplateListQueryHandler,
  ContractTemplateGetQueryHandler,
];

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([
      TenantUserProjectionTypeormEntity,
      ContractMemberTypeormEntity,
      ContractTypeormEntity,
      ContractTemplateTypeormEntity,
    ]),
    RoomModule,
    BuildingModule,
    BillingSettingModule,
    OutboxModule,
    InboxModule,
    InternalHttpModule,
  ],
  controllers: [
    ContractMyController,
    ContractController,
    ContractTemplateController,
    ContractMemberController,
  ],
  providers: [
    IdentityLifecycleSubscriber,
    {
      provide: CONTRACT_DI_TOKEN.TENANT_USER_PROJECTION,
      useClass: TypeOrmTenantUserProjectionRepository,
    },
    {
      provide: CONTRACT_DI_TOKEN.SETTLEMENT,
      useClass: ContractSettlementAdapter,
    },
    {
      provide: CONTRACT_DI_TOKEN.MEMBER_REPOSITORY,
      useClass: TypeOrmContractMemberRepository,
    },
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
    {
      provide: CONTRACT_DI_TOKEN.USER_AVATAR_LOOKUP,
      useClass: IdentityUserAvatarLookupAdapter,
    },
    ...commandHandlers,
    ...queryHandlers,
  ],
  exports: [CONTRACT_DI_TOKEN.REPOSITORY, CONTRACT_DI_TOKEN.MEMBER_REPOSITORY],
})
export class ContractModule {}
