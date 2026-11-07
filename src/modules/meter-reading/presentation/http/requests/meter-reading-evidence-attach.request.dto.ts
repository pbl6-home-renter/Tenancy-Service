import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsUUID } from 'class-validator';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export class MeterReadingEvidenceAttachRequestDto {
  @ApiProperty({ type: [String], format: 'uuid' })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('all', { each: true })
  evidenceMediaIds: Uuid[];
}
