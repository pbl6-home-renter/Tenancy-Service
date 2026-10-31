import { ApiProperty } from '@nestjs/swagger';
import { ContractEntity } from '../../../domain/entities/contract.entity';
import { ContractStatus } from '../../../domain/enums/contract-status.enum';

export class ContractUpdateResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: [ContractStatus.DRAFT] })
  status: ContractStatus;

  @ApiProperty({ type: String, nullable: true, minLength: 1, maxLength: 500 })
  description: string | null;

  static fromDomain(contract: ContractEntity): ContractUpdateResponseDto {
    const response = new ContractUpdateResponseDto();
    response.id = contract.id;
    response.status = contract.status;
    response.description = contract.description;
    return response;
  }
}
