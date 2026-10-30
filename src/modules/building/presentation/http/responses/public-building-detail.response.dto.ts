import { ApiProperty, ApiSchema } from '@nestjs/swagger';
import { BuildingEntity } from '../../../domain/entities/building.entity';
import { BuildingStatus } from '../../../domain/enums/building-status.enum';

@ApiSchema({ name: 'BuildingPublicDetailResponseDto' })
export class PublicBuildingDetailResponseDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  province: string;

  @ApiProperty()
  ward: string;

  @ApiProperty()
  address: string;

  @ApiProperty({ enum: [BuildingStatus.APPROVED] })
  status: BuildingStatus.APPROVED;

  static fromDomain(entity: BuildingEntity): PublicBuildingDetailResponseDto {
    const dto = new PublicBuildingDetailResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.province = entity.province;
    dto.ward = entity.ward;
    dto.address = entity.address;
    dto.status = BuildingStatus.APPROVED;
    return dto;
  }
}
