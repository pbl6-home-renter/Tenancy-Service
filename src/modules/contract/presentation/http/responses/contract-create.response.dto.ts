import { ApiProperty } from '@nestjs/swagger';
import { ContractEntity } from '../../../domain/entities/contract.entity';
import { ContractStatus } from '../../../domain/enums/contract-status.enum';

export class ContractCreateResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: [ContractStatus.DRAFT] })
  status: ContractStatus;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  tenantId: string | null;

  @ApiProperty({ minimum: 0, type: Number })
  rentPrice: number;

  static fromDomain(contract: ContractEntity): ContractCreateResponseDto {
    const response = new ContractCreateResponseDto();
    response.id = contract.id;
    response.status = contract.status;
    response.tenantId = contract.tenantId;
    response.rentPrice = contract.rentPrice;
    return response;
  }
}
