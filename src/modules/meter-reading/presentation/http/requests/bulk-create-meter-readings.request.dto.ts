import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDefined,
  IsEnum,
  Matches,
  ValidateBy,
  ValidateNested,
} from 'class-validator';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { IsUuid } from 'shared/presentation/validators/is-uuid.decorator';
import {
  BulkReadingInput,
  MeterReadingBulkCreateCommand,
} from '../../../application/commands/meter-reading-bulk-create/meter-reading-bulk-create.command';
import { MeterType } from '../../../domain/enums/meter-type.enum';
import { DuplicateBulkMeterReadingException } from '../../../domain/exceptions/duplicate-bulk-meter-reading.exception';
import { MeterValue } from '../../../domain/value-objects/meter-value.vo';
import { ReadingPeriod } from '../../../domain/value-objects/reading-period.vo';

export class BulkMeterReadingItemRequest {
  @ApiProperty({ format: 'uuid' })
  @IsDefined()
  @IsUuid()
  roomId: Uuid;

  @ApiProperty({ enum: MeterType })
  @IsEnum(MeterType)
  type: MeterType;

  @ApiProperty({ type: String, pattern: MeterValue.PATTERN.source })
  @IsDefined()
  @ValidateBy({
    name: 'isMeterValue',
    validator: { validate: (value: unknown) => value instanceof MeterValue },
  })
  @Transform(
    ({ value }: { value: unknown }) =>
      typeof value === 'string' && MeterValue.PATTERN.test(value)
        ? MeterValue.create(value)
        : value,
    { toClassOnly: true },
  )
  currentReading: MeterValue;

  toInput(): BulkReadingInput {
    return {
      roomId: this.roomId,
      type: this.type,
      currentReading: this.currentReading,
      evidenceMediaIds: [],
    };
  }
}

export class BulkCreateMeterReadingsRequest {
  static readonly unexpectedFieldCode = 'VALIDATION_FAILED';

  @ApiProperty({ format: 'uuid' })
  @IsDefined()
  @IsUuid()
  buildingId: Uuid;

  @ApiProperty({ pattern: ReadingPeriod.PATTERN.source })
  @Matches(ReadingPeriod.PATTERN)
  recordedMonth: string;

  @ApiProperty({
    type: () => [BulkMeterReadingItemRequest],
    minItems: 1,
    maxItems: 200,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => BulkMeterReadingItemRequest)
  readings: BulkMeterReadingItemRequest[];

  toCommand(landlordId: Uuid): MeterReadingBulkCreateCommand {
    const readings = new Map<string, BulkReadingInput>();
    for (const reading of this.readings) {
      const key = `${reading.roomId.toLowerCase()}:${reading.type}`;
      if (readings.has(key)) throw new DuplicateBulkMeterReadingException();
      readings.set(key, reading.toInput());
    }

    return new MeterReadingBulkCreateCommand(
      landlordId,
      this.buildingId,
      ReadingPeriod.create(this.recordedMonth),
      readings,
    );
  }
}
