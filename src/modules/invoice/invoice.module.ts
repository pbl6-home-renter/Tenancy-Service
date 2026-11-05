import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoiceCalculatorService } from './domain/services/invoice-calculator.service';
import { TypeOrmInvoiceRepository } from './infrastructure/persistence/invoice.repository';
import { InvoiceTypeormEntity } from './infrastructure/persistence/invoice.typeorm-entity';
import { INVOICE_DI_TOKEN } from './invoice.di-token';

@Module({
  imports: [TypeOrmModule.forFeature([InvoiceTypeormEntity])],
  providers: [
    InvoiceCalculatorService,
    TypeOrmInvoiceRepository,
    {
      provide: INVOICE_DI_TOKEN.REPOSITORY,
      useExisting: TypeOrmInvoiceRepository,
    },
  ],
  exports: [InvoiceCalculatorService, INVOICE_DI_TOKEN.REPOSITORY],
})
export class InvoiceModule {}
