import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, ValidateIf } from 'class-validator';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ContractUpdateCommand } from '../../../application/commands/contract-update/contract-update.command';

export class UpdateContractRequest {
  @ApiProperty({ type: String, minLength: 1, maxLength: 500, nullable: true })
  @ValidateIf((_request, value) => value !== null)
  @IsString()
  @Length(1, 500)
  description: string | null;

  static toCommand(
    request: UpdateContractRequest,
    contractId: Uuid,
    landlordId: Uuid,
  ): ContractUpdateCommand {
    return new ContractUpdateCommand(contractId, landlordId, {
      description: request.description,
    });
  }
}
