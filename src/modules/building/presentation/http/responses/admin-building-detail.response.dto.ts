import { ApiProperty, ApiPropertyOptional, ApiSchema } from '@nestjs/swagger';
import { BuildingGetAdminResult } from '../../../application/queries/building-get-admin/building-get-admin.result';
import { BuildingStatus } from '../../../domain/enums/building-status.enum';

export class AdminBuildingLandlordResponseDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  phone: string;

  @ApiPropertyOptional({ type: String, format: 'email', nullable: true })
  email: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  cccdNumber: string | null;
}

export class AdminBuildingOwnershipDocumentResponseDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id: string;

  @ApiProperty({ type: String, format: 'uri' })
  url: string;

  @ApiPropertyOptional()
  name?: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  uploadedAt?: Date;
}

@ApiSchema({ name: 'BuildingAdminDetailResponseDto' })
export class AdminBuildingDetailResponseDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  province: string;

  @ApiProperty()
  ward: string;

  @ApiProperty({ minLength: 1, maxLength: 254 })
  address: string;

  @ApiPropertyOptional({ example: '0%' })
  occupancyRate: string;

  @ApiProperty({ type: String, format: 'uuid' })
  landlordId: string;

  @ApiProperty({ type: AdminBuildingLandlordResponseDto })
  landlord: AdminBuildingLandlordResponseDto;

  @ApiProperty({ type: [AdminBuildingOwnershipDocumentResponseDto] })
  ownershipDocuments: AdminBuildingOwnershipDocumentResponseDto[];

  @ApiProperty({ enum: BuildingStatus })
  status: BuildingStatus;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    minLength: 1,
    maxLength: 500,
  })
  reviewNote: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  submittedAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  static fromReadModel({
    building,
    landlord,
  }: BuildingGetAdminResult): AdminBuildingDetailResponseDto {
    const dto = new AdminBuildingDetailResponseDto();
    dto.id = building.id;
    dto.name = building.name;
    dto.province = building.province;
    dto.ward = building.ward;
    dto.address = building.address;
    dto.landlordId = building.landlordId;
    dto.landlord = {
      id: building.landlordId,
      name: landlord?.name ?? '',
      phone: landlord?.phone ?? '',
      email: landlord?.email ?? null,
      cccdNumber: null,
    };
    dto.ownershipDocuments = [];
    dto.occupancyRate = '0%';
    dto.status = building.status;
    dto.reviewNote = building.note;
    dto.submittedAt = building.createdAt;
    dto.createdAt = building.createdAt;
    return dto;
  }
}
