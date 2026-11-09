import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, Matches } from 'class-validator';
import { ReadingPeriod } from 'modules/meter-reading/domain/value-objects/reading-period.vo';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { IsUuid } from 'shared/presentation/validators/is-uuid.decorator';
import { InvoiceGenerateCommand } from '../../../application/commands/invoice-generate/invoice-generate.command';

export class InvoiceGenerateRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsDefined()
  @IsUuid()
  buildingId: Uuid;

  @ApiProperty({ pattern: ReadingPeriod.PATTERN.source, example: '2026-10' })
  @Matches(ReadingPeriod.PATTERN)
  period: string;

  toCommand(landlordId: Uuid): InvoiceGenerateCommand {
    return new InvoiceGenerateCommand(
      landlordId,
      this.buildingId,
      ReadingPeriod.create(this.period),
    );
  }
}
