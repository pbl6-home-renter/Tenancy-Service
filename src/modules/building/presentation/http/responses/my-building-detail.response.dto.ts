import { ApiProperty, ApiPropertyOptional, ApiSchema } from '@nestjs/swagger';
import { BuildingEntity } from '../../../domain/entities/building.entity';
import { BuildingStatus } from '../../../domain/enums/building-status.enum';

@ApiSchema({ name: 'BuildingMyDetailResponseDto' })
export class MyBuildingDetailResponseDto {
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

  @ApiProperty({ minimum: 0, type: 'integer' })
  occupiedRooms: number;

  @ApiProperty({ example: '0%' })
  occupancyRate: string;

  @ApiProperty({ enum: BuildingStatus })
  status: BuildingStatus;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    minLength: 1,
    maxLength: 500,
  })
  reviewNote: string | null;

  @ApiPropertyOptional({ type: Object, nullable: true })
  amenities: Record<string, unknown> | null;

  @ApiPropertyOptional({
    type: [String],
    items: { type: 'string', format: 'uri' },
  })
  ownershipCertificateUrls: string[];

  @ApiProperty()
  vietQrConfigured: boolean;

  @ApiPropertyOptional({
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        category: { type: 'string' },
        rateKind: { type: 'string' },
        unit: { type: 'string' },
        unitPrice: { type: 'integer', nullable: true },
      },
    },
  })
  ratePolicies: Array<{
    id: string;
    name: string;
    category: string;
    rateKind: string;
    unit: string;
    unitPrice: number | null;
  }>;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  createdAt: Date;

  static fromDomain(entity: BuildingEntity): MyBuildingDetailResponseDto {
    const dto = new MyBuildingDetailResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.province = entity.province;
    dto.ward = entity.ward;
    dto.address = entity.address;
    // TODO(room): Populate occupancy statistics when room and Contract data are integrated.
    dto.occupiedRooms = 0;
    dto.occupancyRate = '0%';
    dto.status = entity.status;
    dto.reviewNote = entity.note;
    // TODO(building): Expose amenities and totalFloors when the domain supports them.
    dto.amenities = null;
    // TODO(media): Resolve ownership certificates after the media integration.
    dto.ownershipCertificateUrls = [];
    // TODO(billing): Read VietQR configuration and service rate policies.
    dto.vietQrConfigured = false;
    dto.ratePolicies = [];
    dto.createdAt = entity.createdAt;
    return dto;
  }
}
