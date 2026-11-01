import { ApiProperty } from '@nestjs/swagger';
import { IsDefined } from 'class-validator';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { IsUuid } from 'shared/presentation/validators/is-uuid.decorator';
import { ContractActivateCommand } from '../../../application/commands/contract-activate/contract-activate.command';

export class ActivateContractRequest {
  @ApiProperty({ format: 'uuid' })
  @IsDefined()
  @IsUuid()
  signedContractMediaId: Uuid;

  static toCommand(
    request: ActivateContractRequest,
    contractId: Uuid,
    landlordId: Uuid,
  ): ContractActivateCommand {
    return new ContractActivateCommand(
      contractId,
      landlordId,
      request.signedContractMediaId,
    );
  }
}
