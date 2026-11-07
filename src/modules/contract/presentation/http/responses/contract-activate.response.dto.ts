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

  @ApiProperty({ type: [String], format: 'uuid' })
  signedContractMediaIds: Uuid[];

  @ApiProperty({ type: [String] })
  signedContractMediaUrls: string[];

  @ApiProperty({ type: String, format: 'uuid', deprecated: true })
  signedContractMediaId: Uuid;

  @ApiProperty({ description: 'Authenticated Identity media path.' })
  signedContractMediaUrl: string;

  static fromDomain(contract: ContractEntity): ContractActivateResponseDto {
    const response = new ContractActivateResponseDto();
    response.id = contract.id;
    response.status = contract.status;
    response.activatedAt = contract.activatedAt!.toISOString();
    response.signedContractMediaIds = contract.signedContractMediaIds;
    response.signedContractMediaUrls = contract.signedContractMediaIds.map(
      (id) => `/api/v1/media/${id}`,
    );
    response.signedContractMediaId = contract.signedContractMediaIds[0];
    response.signedContractMediaUrl = `/api/v1/media/${response.signedContractMediaId}`;
    return response;
  }
}
