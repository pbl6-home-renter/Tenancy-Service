import { ApiProperty } from '@nestjs/swagger';
import { BuildingEntity } from '../../../domain/entities/building.entity';
import { BuildingStatus } from '../../../domain/enums/building-status.enum';

export class BuildingRejectResponseDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id: string;

  @ApiProperty({ enum: [BuildingStatus.REJECTED] })
  status: BuildingStatus.REJECTED;

  @ApiProperty({ minLength: 1, maxLength: 500 })
  reviewNote: string;

  @ApiProperty({ type: String, format: 'date-time' })
  reviewedAt: Date;

  static fromDomain(entity: BuildingEntity): BuildingRejectResponseDto {
    const dto = new BuildingRejectResponseDto();
    dto.id = entity.id;
    dto.status = BuildingStatus.REJECTED;
    dto.reviewNote = entity.note!;
    dto.reviewedAt = entity.reviewedAt!;
    return dto;
  }
}
