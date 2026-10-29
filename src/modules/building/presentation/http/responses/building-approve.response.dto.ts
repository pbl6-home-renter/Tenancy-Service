import { ApiProperty } from '@nestjs/swagger';
import { BuildingEntity } from '../../../domain/entities/building.entity';
import { BuildingStatus } from '../../../domain/enums/building-status.enum';

export class BuildingApproveResponseDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id: string;

  @ApiProperty({ enum: [BuildingStatus.APPROVED] })
  status: BuildingStatus.APPROVED;

  @ApiProperty({ type: String, format: 'date-time' })
  reviewedAt: Date;

  static fromDomain(entity: BuildingEntity): BuildingApproveResponseDto {
    const dto = new BuildingApproveResponseDto();
    dto.id = entity.id;
    dto.status = BuildingStatus.APPROVED;
    dto.reviewedAt = entity.reviewedAt!;
    return dto;
  }
}
