import { ApiProperty } from '@nestjs/swagger';
import { BuildingEntity } from '../../../domain/entities/building.entity';
import { BuildingStatus } from '../../../domain/enums/building-status.enum';

export class BuildingUpdateResponseDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id: string;

  @ApiProperty({ minLength: 1, maxLength: 254 })
  name: string;

  @ApiProperty({ minLength: 1, maxLength: 254 })
  address: string;

  @ApiProperty({ enum: BuildingStatus })
  status: BuildingStatus;

  static fromDomain(entity: BuildingEntity): BuildingUpdateResponseDto {
    const dto = new BuildingUpdateResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.address = entity.address;
    dto.status = entity.status;
    return dto;
  }
}
