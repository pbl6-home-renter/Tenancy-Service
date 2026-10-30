import { ApiProperty, ApiSchema } from '@nestjs/swagger';
import { BuildingEntity } from '../../../domain/entities/building.entity';

@ApiSchema({ name: 'BuildingPublicListResponseDto' })
export class PublicBuildingListResponseDto {
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

  static fromDomain(entity: BuildingEntity): PublicBuildingListResponseDto {
    const dto = new PublicBuildingListResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.province = entity.province;
    dto.ward = entity.ward;
    dto.address = entity.address;
    return dto;
  }
}
