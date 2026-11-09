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
import { InvoiceCalculationLoaderService } from './application/services/invoice-calculation-loader.service';
import { InvoiceGenerationService } from './application/services/invoice-generation.service';
import { InvoicePersistenceService } from './application/services/invoice-persistence.service';
import { ContractHeadCountAdapter } from './infrastructure/adapters/contract-head-count.adapter';
import { InvoiceController } from './presentation/http/controllers/invoice.controller';
import { InvoiceCalculatorService } from './domain/services/invoice-calculator.service';
import { TypeOrmInvoiceRepository } from './infrastructure/persistence/invoice.repository';
import { InvoiceTypeormEntity } from './infrastructure/persistence/invoice.typeorm-entity';
import { INVOICE_DI_TOKEN } from './invoice.di-token';

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([InvoiceTypeormEntity]),
    BuildingModule,
    ContractModule,
    RoomModule,
    RatePolicyModule,
    MeterReadingModule,
    OutboxModule,
  ],
  controllers: [InvoiceController],
  providers: [
    InvoiceCalculatorService,
    InvoiceCalculationLoaderService,
    InvoiceGenerationService,
    InvoicePersistenceService,
    InvoiceGenerateCommandHandler,
    ContractHeadCountAdapter,
    {
      provide: INVOICE_DI_TOKEN.HEAD_COUNT,
      useExisting: ContractHeadCountAdapter,
    },
    TypeOrmInvoiceRepository,
    {
      provide: INVOICE_DI_TOKEN.REPOSITORY,
      useExisting: TypeOrmInvoiceRepository,
    },
  ],
  exports: [InvoiceCalculatorService, INVOICE_DI_TOKEN.REPOSITORY],
})
export class InvoiceModule {}
