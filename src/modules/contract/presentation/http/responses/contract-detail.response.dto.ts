import { ApiProperty } from '@nestjs/swagger';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ContractEntity } from '../../../domain/entities/contract.entity';
import { ContractStatus } from '../../../domain/enums/contract-status.enum';

export class ContractDetailResponseDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id: Uuid;

  @ApiProperty({ type: String, format: 'uuid' })
  roomId: Uuid;

  @ApiProperty({ enum: ContractStatus })
  status: ContractStatus;

  @ApiProperty({ type: String, nullable: true })
  templateKey: string | null;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  tenantId: Uuid | null;

  @ApiProperty({ type: String, nullable: true, minLength: 1, maxLength: 254 })
  tenantName: string | null;

  @ApiProperty({ type: String, nullable: true })
  tenantPhone: string | null;

  @ApiProperty({ minimum: 0, type: Number })
  rentPrice: number;

  @ApiProperty({ minimum: 0, type: Number })
  depositAmount: number;

  @ApiProperty({ format: 'date' })
  startDate: string;

  @ApiProperty({ format: 'date' })
  endDate: string;

  @ApiProperty({ type: 'integer', minimum: 0, nullable: true })
  vehicleCount: number | null;

  @ApiProperty({ type: String, nullable: true, minLength: 1, maxLength: 500 })
  description: string | null;

  @ApiProperty({ type: [String], format: 'uuid' })
  signedContractMediaIds: Uuid[];

  @ApiProperty({
    type: [String],
    description: 'Authenticated Identity media paths.',
  })
  signedContractMediaUrls: string[];

  @ApiProperty({
    type: String,
    format: 'uuid',
    nullable: true,
    deprecated: true,
  })
  signedContractMediaId: Uuid | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Authenticated Identity media path.',
  })
  signedContractMediaUrl: string | null;

  static fromDomain(contract: ContractEntity): ContractDetailResponseDto {
    const response = new ContractDetailResponseDto();
    response.id = contract.id;
    response.roomId = contract.roomId;
    response.status = contract.status;
    response.templateKey = contract.templateKey;
    response.tenantId = contract.tenantId;
    response.tenantName = contract.tenantName;
    response.tenantPhone = contract.tenantPhone;
    response.rentPrice = contract.rentPrice;
    response.depositAmount = contract.depositAmount;
    response.startDate = contract.startDate;
    response.endDate = contract.endDate;
    response.vehicleCount = contract.vehicleCount;
    response.description = contract.description;
    response.signedContractMediaIds = contract.signedContractMediaIds;
    response.signedContractMediaUrls = contract.signedContractMediaIds.map(
      (id) => `/api/v1/media/${id}`,
    );
    response.signedContractMediaId = contract.signedContractMediaIds[0] ?? null;
    response.signedContractMediaUrl = response.signedContractMediaId
      ? `/api/v1/media/${response.signedContractMediaId}`
      : null;
    return response;
  }
}
