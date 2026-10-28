import { ApiProperty, ApiPropertyOptional, ApiSchema } from '@nestjs/swagger';
import { BuildingEntity } from '../../../domain/entities/building.entity';
import { BuildingStatus } from '../../../domain/enums/building-status.enum';

@ApiSchema({ name: 'BuildingCreateResponseDto' })
export class BuildingResponseDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id: string;

  @ApiProperty({ enum: BuildingStatus, example: BuildingStatus.PENDING })
  status: BuildingStatus;

  @ApiProperty({ type: String, example: '20.995100' })
  latitude: string;

  @ApiProperty({ type: String, example: '105.816649' })
  longitude: string;

  @ApiPropertyOptional({
    description:
      'Reserved for the media flow; currently omitted from responses.',
    type: [String],
    items: { type: 'string', format: 'uuid' },
  })
  ownershipCertificateMediaIds?: string[];

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  static fromDomain(entity: BuildingEntity): BuildingResponseDto {
    const dto = new BuildingResponseDto();
    dto.id = entity.id;
    dto.status = entity.status;
    dto.latitude = entity.latitude.value.toFixed(6);
    dto.longitude = entity.longitude.value.toFixed(6);
    dto.createdAt = entity.createdAt;
    return dto;
  }
}
