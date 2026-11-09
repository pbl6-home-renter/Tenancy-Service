import { ApiProperty } from '@nestjs/swagger';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { InvoiceEntity } from '../../../domain/entities/invoice.entity';
import { InvoiceStatus } from '../../../domain/enums/invoice-status.enum';

export class InvoiceCancelResponseDto {
  @ApiProperty({ format: 'uuid' }) id: Uuid;
  @ApiProperty({ enum: [InvoiceStatus.VOID] })
  invoiceStatus: InvoiceStatus.VOID;
  @ApiProperty() voidReason: string;

  static fromDomain(invoice: InvoiceEntity): InvoiceCancelResponseDto {
    return Object.assign(new InvoiceCancelResponseDto(), {
      id: invoice.id,
      invoiceStatus: InvoiceStatus.VOID,
      voidReason: invoice.voidReason!,
    });
  }
}
