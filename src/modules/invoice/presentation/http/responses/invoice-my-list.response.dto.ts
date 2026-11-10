import { ApiProperty } from '@nestjs/swagger';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { InvoiceMyListView } from '../../../application/ports/invoice-read.port';
import { InvoiceStatus } from '../../../domain/enums/invoice-status.enum';

export class InvoiceMyListResponseDto implements InvoiceMyListView {
  @ApiProperty({ format: 'uuid' }) id: Uuid;
  @ApiProperty() code: string;
  @ApiProperty({ format: 'uuid' }) contractId: Uuid;
  @ApiProperty() roomName: string;
  @ApiProperty({ example: '2026-10' }) period: string;
  @ApiProperty({ type: String }) totalAmount: string;
  @ApiProperty({ enum: [InvoiceStatus.ISSUED] })
  invoiceStatus: InvoiceStatus.ISSUED;
  @ApiProperty({ type: Date }) issuedAt: Date;

  static fromView(view: InvoiceMyListView): InvoiceMyListResponseDto {
    return Object.assign(new InvoiceMyListResponseDto(), view);
  }
}
