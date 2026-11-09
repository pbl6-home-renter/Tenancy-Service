import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { InvoiceUpdateCommand } from '../../../application/commands/invoice-update/invoice-update.command';

export class InvoiceFeeRequestDto {
  @ApiProperty({ minLength: 1, maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiProperty({ type: String, pattern: '^-?(0|[1-9]\\d*)(\\.\\d{1,2})?$' })
  @IsString()
  @Matches(/^-?(0|[1-9]\d*)(?:\.\d{1,2})?$/)
  amount: string;
}

export class InvoiceUpdateRequestDto {
  @ApiPropertyOptional({ type: [InvoiceFeeRequestDto], maxItems: 20 })
  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => InvoiceFeeRequestDto)
  otherFees?: InvoiceFeeRequestDto[];

  @ApiPropertyOptional({ type: String, maxLength: 500, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string | null;

  toCommand(invoiceId: Uuid, landlordId: Uuid): InvoiceUpdateCommand {
    if (this.otherFees === undefined && this.note === undefined)
      throw new ValidationException('otherFees or note is required');
    return new InvoiceUpdateCommand(
      invoiceId,
      landlordId,
      this.otherFees,
      this.note,
    );
  }
}
