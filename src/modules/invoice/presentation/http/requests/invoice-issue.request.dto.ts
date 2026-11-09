import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsOptional } from 'class-validator';
import { Uuid, isValidUuid } from 'shared/domain/value-objects/uuid.vo';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { InvoiceIssueCommand } from '../../../application/commands/invoice-issue/invoice-issue.command';
import { InvoiceIdsRequiredException } from '../../../domain/exceptions/invoice-ids-required.exception';
import { InvoiceIdsTooLargeException } from '../../../domain/exceptions/invoice-ids-too-large.exception';

export class InvoiceIssueRequestDto {
  @ApiProperty({
    type: [String],
    minItems: 1,
    maxItems: 100,
    uniqueItems: true,
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  invoiceIds: Uuid[];

  toCommand(landlordId: Uuid, key: string | undefined): InvoiceIssueCommand {
    if (!isValidUuid(key))
      throw new ValidationException('Idempotency-Key must be a UUID');
    if (!Array.isArray(this.invoiceIds) || this.invoiceIds.length === 0)
      throw new InvoiceIdsRequiredException();
    if (this.invoiceIds.length > 100) throw new InvoiceIdsTooLargeException();
    if (!this.invoiceIds.every((id) => isValidUuid(id)))
      throw new ValidationException('invoiceIds must contain UUIDs');
    return new InvoiceIssueCommand(landlordId, key as Uuid, this.invoiceIds);
  }
}
