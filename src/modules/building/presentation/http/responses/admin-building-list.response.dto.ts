import { ApiProperty, ApiSchema } from '@nestjs/swagger';
import { BuildingListForAdminResult } from '../../../application/queries/building-list-for-admin/building-list-for-admin.result';
import { BuildingStatus } from '../../../domain/enums/building-status.enum';

@ApiSchema({ name: 'BuildingAdminListResponseDto' })
export class AdminBuildingListResponseDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ type: String, format: 'uuid' })
  landlordId: string;

  @ApiProperty()
  landlordName: string;

  @ApiProperty()
  landlordPhone: string;

  @ApiProperty({ enum: BuildingStatus })
  status: BuildingStatus;

  @ApiProperty({ minimum: 0, type: 'integer' })
  documentsCount: number;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  static fromReadModel({
    building,
    landlord,
  }: BuildingListForAdminResult): AdminBuildingListResponseDto {
    const dto = new AdminBuildingListResponseDto();
    dto.id = building.id;
    dto.name = building.name;
    dto.landlordId = building.landlordId;
    dto.landlordName = landlord?.name ?? '';
    dto.landlordPhone = landlord?.phone ?? '';
    dto.status = building.status;
    dto.documentsCount = 0;
    dto.createdAt = building.createdAt;
    return dto;
  }
}
