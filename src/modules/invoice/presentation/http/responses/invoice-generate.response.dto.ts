import { ApiProperty } from '@nestjs/swagger';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { InvoiceGenerateResult } from '../../../application/commands/invoice-generate/invoice-generate.result';
import { InvoiceBlockReason } from '../../../domain/enums/invoice-block-reason.enum';

export class InvoiceGeneratedItemDto {
  @ApiProperty({ format: 'uuid' })
  invoiceId: Uuid;

  @ApiProperty()
  code: string;

  @ApiProperty({ format: 'uuid' })
  contractId: Uuid;

  @ApiProperty({ format: 'uuid' })
  roomId: Uuid;

  @ApiProperty()
  totalAmount: string;
}

export class InvoiceBlockedItemDto {
  @ApiProperty({ format: 'uuid' })
  roomId: Uuid;

  @ApiProperty({ format: 'uuid' })
  contractId: Uuid;

  @ApiProperty({ enum: InvoiceBlockReason })
  reasonCode: InvoiceBlockReason;
}

export class InvoiceGenerateResponseDto implements InvoiceGenerateResult {
  @ApiProperty({ format: 'uuid' })
  buildingId: Uuid;

  @ApiProperty({ example: '2026-10' })
  period: string;

  @ApiProperty({ type: [InvoiceGeneratedItemDto] })
  generated: InvoiceGeneratedItemDto[];

  @ApiProperty({ type: [InvoiceGeneratedItemDto] })
  recalculated: InvoiceGeneratedItemDto[];

  @ApiProperty({ type: [InvoiceBlockedItemDto] })
  blocked: InvoiceBlockedItemDto[];

  static fromResult(result: InvoiceGenerateResult): InvoiceGenerateResponseDto {
    return Object.assign(new InvoiceGenerateResponseDto(), result);
  }
}
