import { ApiProperty } from '@nestjs/swagger';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import {
  InvoiceIssueResult,
  InvoiceIssueSucceeded,
  InvoiceIssueFailed,
} from '../../../application/commands/invoice-issue/invoice-issue.result';
import { InvoiceStatus } from '../../../domain/enums/invoice-status.enum';

export class InvoiceIssueSucceededDto implements InvoiceIssueSucceeded {
  @ApiProperty({ format: 'uuid' }) id: Uuid;
  @ApiProperty() code: string;
  @ApiProperty({ enum: [InvoiceStatus.ISSUED] })
  invoiceStatus: InvoiceStatus.ISSUED;
  @ApiProperty({ format: 'date-time' }) issuedAt: string;
}

export class InvoiceIssueFailedDto implements InvoiceIssueFailed {
  @ApiProperty({ format: 'uuid' }) invoiceId: Uuid;
  @ApiProperty() code: string;
}

export class InvoiceIssueResponseDto implements InvoiceIssueResult {
  @ApiProperty() requested: number;
  @ApiProperty({ type: [InvoiceIssueSucceededDto] })
  succeeded: InvoiceIssueSucceededDto[];
  @ApiProperty({ type: [InvoiceIssueFailedDto] })
  failed: InvoiceIssueFailedDto[];

  static fromResult(result: InvoiceIssueResult): InvoiceIssueResponseDto {
    return Object.assign(new InvoiceIssueResponseDto(), result);
  }
}
