import { ApiProperty } from '@nestjs/swagger';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import {
  BulkRoomReadingResult,
  MeterReadingBulkCreateResult,
} from '../../../application/commands/meter-reading-bulk-create/meter-reading-bulk-create.result';

export class BulkRoomReadingResponseDto implements BulkRoomReadingResult {
  @ApiProperty({ format: 'uuid' })
  roomId: Uuid;

  @ApiProperty()
  roomName: string;

  @ApiProperty({ format: 'uuid', nullable: true })
  electricityReadingId: Uuid | null;

  @ApiProperty({ nullable: true })
  electricityUsage: string | null;

  @ApiProperty({ format: 'uuid', nullable: true })
  waterReadingId: Uuid | null;

  @ApiProperty({ nullable: true })
  waterUsage: string | null;

  @ApiProperty({ enum: ['SUCCESS'] })
  status: 'SUCCESS';

  @ApiProperty({ nullable: true })
  note: string | null;
}

export class BulkMeterReadingResponseDto implements MeterReadingBulkCreateResult {
  @ApiProperty({ format: 'uuid' })
  buildingId: Uuid;

  @ApiProperty()
  buildingName: string;

  @ApiProperty()
  recordedMonth: string;

  @ApiProperty()
  totalRoomsRecorded: number;

  @ApiProperty()
  totalElectricityUsage: string;

  @ApiProperty()
  totalWaterUsage: string;

  @ApiProperty({ type: () => [BulkRoomReadingResponseDto] })
  results: BulkRoomReadingResponseDto[];

  static fromResult(
    result: MeterReadingBulkCreateResult,
  ): BulkMeterReadingResponseDto {
    return Object.assign(new BulkMeterReadingResponseDto(), result);
  }
}
