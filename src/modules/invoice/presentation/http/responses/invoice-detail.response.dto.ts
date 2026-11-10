import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { InvoiceDetailView } from '../../../application/ports/invoice-read.port';
import {
  InvoiceLine,
  InvoiceOtherFee,
} from '../../../domain/entities/invoice.props';
import { InvoiceStatus } from '../../../domain/enums/invoice-status.enum';

export class InvoiceDetailResponseDto {
  @ApiProperty({ format: 'uuid' }) id: Uuid;
  @ApiProperty() code: string;
  @ApiProperty({ format: 'uuid' }) contractId: Uuid;
  @ApiProperty({ format: 'uuid' }) roomId: Uuid;
  @ApiProperty() roomName: string;
  @ApiProperty({ nullable: true }) tenantName: string | null;
  @ApiProperty({ nullable: true }) tenantPhone: string | null;
  @ApiProperty({ example: '2026-10' }) period: string;
  @ApiProperty({ type: String }) rentAmount: string;
  @ApiProperty({ type: [Object] }) breakdown: InvoiceLine[];
  @ApiProperty({ type: [Object] }) otherFees: InvoiceOtherFee[];
  @ApiProperty({ type: String }) totalAmount: string;
  @ApiProperty({ enum: InvoiceStatus }) invoiceStatus: InvoiceStatus;
  @ApiProperty({ type: Date, nullable: true }) issuedAt: Date | null;
  @ApiProperty({ format: 'uuid', nullable: true }) voidedInvoiceId: Uuid | null;
  @ApiPropertyOptional({ nullable: true }) voidReason?: string | null;
  @ApiProperty({ nullable: true }) note: string | null;

  static fromView(view: InvoiceDetailView): InvoiceDetailResponseDto {
    const invoice = view.invoice;
    return Object.assign(new InvoiceDetailResponseDto(), {
      id: invoice.id,
      code: invoice.code.value,
      contractId: invoice.contractId,
      roomId: view.roomId,
      roomName: view.roomName,
      tenantName: view.tenantName,
      tenantPhone: view.tenantPhone,
      period: invoice.period.value,
      rentAmount: invoice.rentAmount,
      breakdown: [...invoice.breakdown],
      otherFees: [...invoice.otherFees],
      totalAmount: invoice.totalAmount,
      invoiceStatus: invoice.status,
      issuedAt: invoice.issuedAt,
      voidedInvoiceId: invoice.voidedInvoiceId,
      voidReason: invoice.voidReason,
      note: invoice.note,
    });
  }
}
