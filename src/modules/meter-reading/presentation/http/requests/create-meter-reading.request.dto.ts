import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDefined,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { IsUuid } from 'shared/presentation/validators/is-uuid.decorator';
import { MeterReadingCreateCommand } from '../../../application/commands/meter-reading-create/meter-reading-create.command';
import { MeterType } from '../../../domain/enums/meter-type.enum';
import { MeterValue } from '../../../domain/value-objects/meter-value.vo';
import { ReadingPeriod } from '../../../domain/value-objects/reading-period.vo';

export class CreateMeterReadingRequest {
  @ApiProperty({ format: 'uuid' })
  @IsDefined()
  @IsUuid()
  roomId: Uuid;

  @ApiProperty({ enum: MeterType })
  @IsEnum(MeterType)
  type: MeterType;

  @ApiProperty({ pattern: ReadingPeriod.PATTERN.source })
  @Matches(ReadingPeriod.PATTERN)
  period: string;

  @ApiProperty({ pattern: MeterValue.PATTERN.source })
  @IsString()
  @Matches(MeterValue.PATTERN)
  currentReading: string;

  @ApiProperty({ required: false, pattern: MeterValue.PATTERN.source })
  @IsOptional()
  @IsString()
  @Matches(MeterValue.PATTERN)
  previousReading?: string;

  @ApiProperty()
  @IsBoolean()
  isBaseline: boolean;

  @ApiProperty({ format: 'uuid' })
  @IsDefined({ message: 'EVIDENCE_REQUIRED' })
  @IsUuid()
  evidenceMediaId: Uuid;

  static toCommand(
    request: CreateMeterReadingRequest,
    landlordId: Uuid,
  ): MeterReadingCreateCommand {
    return new MeterReadingCreateCommand(
      landlordId,
      request.roomId,
      request.type,
      ReadingPeriod.create(request.period),
      MeterValue.create(request.currentReading),
      request.isBaseline,
      request.previousReading === undefined
        ? null
        : MeterValue.create(request.previousReading),
      request.evidenceMediaId,
    );
  }
}
