import { ApiProperty } from '@nestjs/swagger';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ContractEntity } from '../../../domain/entities/contract.entity';
import { ContractStatus } from '../../../domain/enums/contract-status.enum';

export class ContractCheckoutCompleteResponseDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id: Uuid;

  @ApiProperty({ enum: [ContractStatus.TERMINATED] })
  status: ContractStatus;

  @ApiProperty({ format: 'date' })
  completedOn: string;

  static fromDomain(
    contract: ContractEntity,
    completedOn: Date,
  ): ContractCheckoutCompleteResponseDto {
    const response = new ContractCheckoutCompleteResponseDto();
    response.id = contract.id;
    response.status = contract.status;
    response.completedOn = completedOn.toISOString().slice(0, 10);
    return response;
  }
}
