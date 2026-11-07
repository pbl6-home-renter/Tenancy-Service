import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsOptional, IsUUID } from 'class-validator';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { IsUuid } from 'shared/presentation/validators/is-uuid.decorator';
import { ContractActivateCommand } from '../../../application/commands/contract-activate/contract-activate.command';

export class ActivateContractRequest {
  @ApiProperty({ type: [String], format: 'uuid', required: false })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('all', { each: true })
  signedContractMediaIds?: Uuid[];

  @ApiProperty({ format: 'uuid', required: false, deprecated: true })
  @IsOptional()
  @IsUuid()
  signedContractMediaId?: Uuid;

  static toCommand(
    request: ActivateContractRequest,
    contractId: Uuid,
    landlordId: Uuid,
  ): ContractActivateCommand {
    return new ContractActivateCommand(
      contractId,
      landlordId,
      request.signedContractMediaIds ??
        (request.signedContractMediaId ? [request.signedContractMediaId] : []),
    );
  }
}
