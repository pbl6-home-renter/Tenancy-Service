import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsString, Length, Max, Min, ValidateIf } from 'class-validator';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ContractUpdateCommand } from '../../../application/commands/contract-update/contract-update.command';
import { UpdateContractProps } from '../../../domain/entities/contract.props';

export class UpdateContractRequest {
  @ApiPropertyOptional({
    type: String,
    minLength: 1,
    maxLength: 500,
    nullable: true,
  })
  @ValidateIf((_request, value) => value !== undefined && value !== null)
  @IsString()
  @Length(1, 500)
  description?: string | null;

  @ApiPropertyOptional({
    type: 'integer',
    minimum: 0,
    maximum: 2147483647,
    nullable: true,
  })
  @ValidateIf((_request, value) => value !== undefined && value !== null)
  @IsInt()
  @Min(0)
  @Max(2147483647)
  vehicleCount?: number | null;

  static toCommand(
    request: UpdateContractRequest,
    contractId: Uuid,
    landlordId: Uuid,
  ): ContractUpdateCommand {
    const updates: UpdateContractProps = {};
    if (request.description !== undefined) {
      updates.description = request.description;
    }
    if (request.vehicleCount !== undefined) {
      updates.vehicleCount = request.vehicleCount;
    }
    return new ContractUpdateCommand(contractId, landlordId, updates);
  }
}
