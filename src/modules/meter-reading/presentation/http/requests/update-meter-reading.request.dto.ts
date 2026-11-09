import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDefined, IsString, Matches, ValidateIf } from 'class-validator';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { IsUuid } from 'shared/presentation/validators/is-uuid.decorator';
import { MeterReadingUpdateCommand } from '../../../application/commands/meter-reading-update/meter-reading-update.command';
import { MeterValue } from '../../../domain/value-objects/meter-value.vo';

export class UpdateMeterReadingRequest {
  static readonly unexpectedFieldCode = 'VALIDATION_FAILED';

  @ApiPropertyOptional({ pattern: MeterValue.PATTERN.source })
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @Matches(MeterValue.PATTERN)
  currentReading?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @ValidateIf((_, value) => value !== undefined)
  @IsDefined()
  @IsUuid()
  evidenceMediaId?: Uuid;

  toCommand(landlordId: Uuid, readingId: Uuid): MeterReadingUpdateCommand {
    if (this.currentReading === undefined && this.evidenceMediaId === undefined)
      throw new ValidationException('At least one field must be provided');
    return new MeterReadingUpdateCommand(
      landlordId,
      readingId,
      this.currentReading === undefined
        ? undefined
        : MeterValue.create(this.currentReading),
      this.evidenceMediaId === undefined ? undefined : [this.evidenceMediaId],
    );
  }
}
