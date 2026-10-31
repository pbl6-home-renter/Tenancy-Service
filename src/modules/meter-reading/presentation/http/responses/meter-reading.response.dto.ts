import { ApiProperty } from '@nestjs/swagger';
import { MeterReadingEntity } from '../../../domain/entities/meter-reading.entity';
import { MeterType } from '../../../domain/enums/meter-type.enum';

export class MeterReadingResponseDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ format: 'uuid' }) roomId: string;
  @ApiProperty({ format: 'uuid' }) buildingId: string;
  @ApiProperty({ enum: MeterType }) type: MeterType;
  @ApiProperty() period: string;
  @ApiProperty() previousReading: string;
  @ApiProperty() currentReading: string;
  @ApiProperty() consumption: string;
  @ApiProperty() isBaseline: boolean;
  @ApiProperty({ format: 'uuid' }) evidenceMediaId: string;
  @ApiProperty({ format: 'date-time' }) createdAt: Date;

  static fromDomain(reading: MeterReadingEntity): MeterReadingResponseDto {
    const response = new MeterReadingResponseDto();
    response.id = reading.id;
    response.roomId = reading.roomId;
    response.buildingId = reading.buildingId;
    response.type = reading.type;
    response.period = reading.period.value;
    response.previousReading = reading.previousReading.value;
    response.currentReading = reading.currentReading.value;
    response.consumption = reading.consumption;
    response.isBaseline = reading.isBaseline;
    response.evidenceMediaId = reading.evidenceMediaId;
    response.createdAt = reading.createdAt;
    return response;
  }
}
