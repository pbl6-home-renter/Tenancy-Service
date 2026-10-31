import { ApiProperty } from '@nestjs/swagger';
import { ContractEntity } from '../../../domain/entities/contract.entity';
import { ContractStatus } from '../../../domain/enums/contract-status.enum';

export class ContractDetailResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  roomId: string;

  @ApiProperty({ enum: ContractStatus })
  status: ContractStatus;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  tenantId: string | null;

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

  static fromDomain(contract: ContractEntity): ContractDetailResponseDto {
    const response = new ContractDetailResponseDto();
    response.id = contract.id;
    response.roomId = contract.roomId;
    response.status = contract.status;
    response.tenantId = contract.tenantId;
    response.tenantName = contract.tenantName;
    response.tenantPhone = contract.tenantPhone;
    response.rentPrice = contract.rentPrice;
    response.depositAmount = contract.depositAmount;
    response.startDate = contract.startDate;
    response.endDate = contract.endDate;
    response.vehicleCount = contract.vehicleCount;
    response.description = contract.description;
    return response;
  }
}
