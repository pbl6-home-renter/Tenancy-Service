import { ApiProperty } from '@nestjs/swagger';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { InvoiceEntity } from '../../../domain/entities/invoice.entity';
import { InvoiceOtherFee } from '../../../domain/entities/invoice.props';

export class InvoiceUpdateResponseDto {
  @ApiProperty({ format: 'uuid' }) id: Uuid;
  @ApiProperty({ type: [Object] }) otherFees: InvoiceOtherFee[];
  @ApiProperty({ nullable: true }) note: string | null;
  @ApiProperty({ type: String }) totalAmount: string;

  static fromDomain(invoice: InvoiceEntity): InvoiceUpdateResponseDto {
    return Object.assign(new InvoiceUpdateResponseDto(), {
      id: invoice.id,
      otherFees: [...invoice.otherFees],
      note: invoice.note,
      totalAmount: invoice.totalAmount,
    });
  }
}
