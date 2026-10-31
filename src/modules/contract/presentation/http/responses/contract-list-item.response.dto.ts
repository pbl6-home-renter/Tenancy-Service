import { ApiProperty } from '@nestjs/swagger';
import { ContractListResult } from '../../../application/queries/contract-list/contract-list.result';
import { ContractStatus } from '../../../domain/enums/contract-status.enum';

export class ContractListItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'HD-3fa85f' })
  contractCode: string;

  @ApiProperty({ format: 'uuid' })
  roomId: string;

  @ApiProperty()
  roomName: string;

  @ApiProperty({ type: String, nullable: true })
  tenantName: string | null;

  @ApiProperty({ type: String, nullable: true })
  tenantPhone: string | null;

  @ApiProperty({ enum: ContractStatus })
  status: ContractStatus;

  @ApiProperty({ minimum: 0, type: Number })
  rentPrice: number;

  @ApiProperty({ minimum: 0, type: Number })
  depositAmount: number;

  @ApiProperty({ format: 'date' })
  startDate: string;

  @ApiProperty({ format: 'date' })
  endDate: string;

  static fromReadModel(
    contract: ContractListResult,
  ): ContractListItemResponseDto {
    const response = new ContractListItemResponseDto();
    response.id = contract.id;
    // TODO(contract): Use a persisted code if the API owner introduces one.
    response.contractCode = `HD-${contract.id.slice(0, 6)}`;
    response.roomId = contract.roomId;
    response.roomName = contract.roomName;
    response.tenantName = contract.tenantName;
    response.tenantPhone = contract.tenantPhone;
    response.status = contract.status;
    response.rentPrice = contract.rentPrice;
    response.depositAmount = contract.depositAmount;
    response.startDate = contract.startDate;
    response.endDate = contract.endDate;
    return response;
  }
}
