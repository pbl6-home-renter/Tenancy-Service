import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { InvoiceCancelCommand } from '../../../application/commands/invoice-cancel/invoice-cancel.command';

export class InvoiceCancelRequestDto {
  @ApiProperty({ minLength: 1, maxLength: 500 })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason: string;

  toCommand(invoiceId: Uuid, landlordId: Uuid): InvoiceCancelCommand {
    return new InvoiceCancelCommand(invoiceId, landlordId, this.reason);
  }
}
