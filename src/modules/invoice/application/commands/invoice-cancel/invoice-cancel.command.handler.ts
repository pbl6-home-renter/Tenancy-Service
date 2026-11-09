import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UNIT_OF_WORK_DI_TOKEN } from 'shared/application/di-tokens';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { INVOICE_DI_TOKEN } from '../../../invoice.di-token';
import { InvoiceEntity } from '../../../domain/entities/invoice.entity';
import { InvoiceNotFoundException } from '../../../domain/exceptions/invoice-not-found.exception';
import { InvoiceRepository } from '../../../domain/repositories/invoice.repository';
import { InvoiceOwnershipService } from '../../services/invoice-ownership.service';
import { InvoicePersistenceService } from '../../services/invoice-persistence.service';
import { InvoiceCancelCommand } from './invoice-cancel.command';

@CommandHandler(InvoiceCancelCommand)
export class InvoiceCancelCommandHandler implements ICommandHandler<
  InvoiceCancelCommand,
  InvoiceEntity
> {
  constructor(
    @Inject(INVOICE_DI_TOKEN.REPOSITORY)
    private readonly invoices: InvoiceRepository,
    @Inject(UNIT_OF_WORK_DI_TOKEN)
    private readonly unitOfWork: IUnitOfWork,
    private readonly ownership: InvoiceOwnershipService,
    private readonly persistence: InvoicePersistenceService,
  ) {}

  execute(command: InvoiceCancelCommand): Promise<InvoiceEntity> {
    return this.unitOfWork.run(async (context) => {
      const invoice = await this.invoices.findByIdForUpdate(
        command.invoiceId,
        context,
      );
      if (!invoice) throw new InvoiceNotFoundException();
      await this.ownership.assertLandlord(invoice, command.landlordId, context);
      invoice.void(command.reason);
      await this.persistence.saveWithEvents(invoice, context);
      return invoice;
    });
  }
}
