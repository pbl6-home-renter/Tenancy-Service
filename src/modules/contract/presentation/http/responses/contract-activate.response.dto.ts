import { ApiProperty } from '@nestjs/swagger';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ContractEntity } from '../../../domain/entities/contract.entity';
import { ContractStatus } from '../../../domain/enums/contract-status.enum';

export class ContractActivateResponseDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id: Uuid;

  @ApiProperty({ enum: [ContractStatus.ACTIVE] })
  status: ContractStatus;

  @ApiProperty({ type: String, format: 'date-time' })
  activatedAt: string;

  static fromDomain(contract: ContractEntity): ContractActivateResponseDto {
    const response = new ContractActivateResponseDto();
    response.id = contract.id;
    response.status = contract.status;
    response.activatedAt = contract.activatedAt!.toISOString();
    return response;
  }
}
