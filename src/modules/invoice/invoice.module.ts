import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BuildingModule } from 'modules/building/building.module';
import { ContractModule } from 'modules/contract/contract.module';
import { MeterReadingModule } from 'modules/meter-reading/meter-reading.module';
import { OutboxModule } from 'modules/outbox/outbox.module';
import { RatePolicyModule } from 'modules/rate-policy/rate-policy.module';
import { RoomModule } from 'modules/room/room.module';
import { InvoiceGenerateCommandHandler } from './application/commands/invoice-generate/invoice-generate.command.handler';
import { InvoiceCancelCommandHandler } from './application/commands/invoice-cancel/invoice-cancel.command.handler';
import { InvoiceIssueCommandHandler } from './application/commands/invoice-issue/invoice-issue.command.handler';
import { InvoiceUpdateCommandHandler } from './application/commands/invoice-update/invoice-update.command.handler';
import { InvoiceDetailQueryHandler } from './application/queries/invoice-detail/invoice-detail.query.handler';
import { InvoiceListQueryHandler } from './application/queries/invoice-list/invoice-list.query.handler';
import { InvoiceMyListQueryHandler } from './application/queries/invoice-my-list/invoice-my-list.query.handler';
import { InvoiceCalculationLoaderService } from './application/services/invoice-calculation-loader.service';
import { InvoiceGenerationService } from './application/services/invoice-generation.service';
import { InvoiceIssueItemService } from './application/services/invoice-issue-item.service';
import { InvoiceOwnershipService } from './application/services/invoice-ownership.service';
import { InvoicePersistenceService } from './application/services/invoice-persistence.service';
import { ContractHeadCountAdapter } from './infrastructure/adapters/contract-head-count.adapter';
import { InvoiceController } from './presentation/http/controllers/invoice.controller';
import { InvoiceMyController } from './presentation/http/controllers/invoice-my.controller';
import { InvoiceCalculatorService } from './domain/services/invoice-calculator.service';
import { TypeOrmInvoiceRepository } from './infrastructure/persistence/invoice.repository';
import { TypeOrmInvoiceIdempotencyRepository } from './infrastructure/persistence/invoice-idempotency.repository';
import { InvoiceIdempotencyTypeormEntity } from './infrastructure/persistence/invoice-idempotency.typeorm-entity';
import { TypeOrmInvoiceReadAdapter } from './infrastructure/persistence/invoice-read.adapter';
import { InvoiceTypeormEntity } from './infrastructure/persistence/invoice.typeorm-entity';
import { INVOICE_DI_TOKEN } from './invoice.di-token';

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([
      InvoiceTypeormEntity,
      InvoiceIdempotencyTypeormEntity,
    ]),
    BuildingModule,
    ContractModule,
    RoomModule,
    RatePolicyModule,
    MeterReadingModule,
    OutboxModule,
  ],
  controllers: [InvoiceController, InvoiceMyController],
  providers: [
    InvoiceCalculatorService,
    InvoiceCalculationLoaderService,
    InvoiceGenerationService,
    InvoiceIssueItemService,
    InvoiceOwnershipService,
    InvoicePersistenceService,
    InvoiceGenerateCommandHandler,
    InvoiceIssueCommandHandler,
    InvoiceUpdateCommandHandler,
    InvoiceCancelCommandHandler,
    InvoiceListQueryHandler,
    InvoiceMyListQueryHandler,
    InvoiceDetailQueryHandler,
    ContractHeadCountAdapter,
    {
      provide: INVOICE_DI_TOKEN.HEAD_COUNT,
      useExisting: ContractHeadCountAdapter,
    },
    TypeOrmInvoiceRepository,
    TypeOrmInvoiceReadAdapter,
    TypeOrmInvoiceIdempotencyRepository,
    {
      provide: INVOICE_DI_TOKEN.REPOSITORY,
      useExisting: TypeOrmInvoiceRepository,
    },
    {
      provide: INVOICE_DI_TOKEN.READ,
      useExisting: TypeOrmInvoiceReadAdapter,
    },
    {
      provide: INVOICE_DI_TOKEN.IDEMPOTENCY,
      useExisting: TypeOrmInvoiceIdempotencyRepository,
    },
  ],
  exports: [InvoiceCalculatorService, INVOICE_DI_TOKEN.REPOSITORY],
})
export class InvoiceModule {}
