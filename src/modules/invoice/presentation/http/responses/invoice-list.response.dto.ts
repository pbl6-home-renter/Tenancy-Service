import { ApiProperty } from '@nestjs/swagger';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { InvoiceListView } from '../../../application/ports/invoice-read.port';
import { InvoiceStatus } from '../../../domain/enums/invoice-status.enum';

export class InvoiceListResponseDto implements InvoiceListView {
  @ApiProperty({ format: 'uuid' }) id: Uuid;
  @ApiProperty() code: string;
  @ApiProperty({ format: 'uuid' }) contractId: Uuid;
  @ApiProperty({ format: 'uuid' }) roomId: Uuid;
  @ApiProperty() roomName: string;
  @ApiProperty({ nullable: true }) tenantName: string | null;
  @ApiProperty({ nullable: true }) tenantPhone: string | null;
  @ApiProperty({ example: '2026-10' }) period: string;
  @ApiProperty({ type: String }) totalAmount: string;
  @ApiProperty({ enum: InvoiceStatus }) invoiceStatus: InvoiceStatus;
  @ApiProperty({ type: Date, nullable: true }) issuedAt: Date | null;

  static fromView(view: InvoiceListView): InvoiceListResponseDto {
    return Object.assign(new InvoiceListResponseDto(), view);
  }
}
