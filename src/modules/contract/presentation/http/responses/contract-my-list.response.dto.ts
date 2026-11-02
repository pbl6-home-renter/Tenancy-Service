import { ApiProperty } from '@nestjs/swagger';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ContractStatus } from '../../../domain/enums/contract-status.enum';
import { ContractMyListResult } from '../../../domain/repositories/contract-read.repository';

export class ContractMyListResponseDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id: Uuid;

  @ApiProperty({ example: 'HD-3fa85f' })
  contractCode: string;

  @ApiProperty({ type: String, format: 'uuid' })
  roomId: Uuid;

  @ApiProperty()
  roomName: string;

  @ApiProperty()
  buildingName: string;

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
    contract: ContractMyListResult,
  ): ContractMyListResponseDto {
    const response = new ContractMyListResponseDto();
    response.id = contract.id;
    response.contractCode = `HD-${contract.id.slice(0, 6)}`;
    response.roomId = contract.roomId;
    response.roomName = contract.roomName;
    response.buildingName = contract.buildingName;
    response.status = contract.status;
    response.rentPrice = contract.rentPrice;
    response.depositAmount = contract.depositAmount;
    response.startDate = contract.startDate;
    response.endDate = contract.endDate;
    return response;
  }
}
