import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsIn } from 'class-validator';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ContractLockDecisionCommand } from '../../../application/commands/contract-lock-decision/contract-lock-decision.command';
import { ContractLockDecisionAction } from '../../../domain/entities/landlord-lock-cycle.props';

export class ContractLockDecisionRequestDto {
  @ApiProperty({ enum: ['restore', 'terminate'] })
  @IsDefined()
  @IsIn(['restore', 'terminate'])
  action: ContractLockDecisionAction;

  static toCommand(
    request: ContractLockDecisionRequestDto,
    landlordId: Uuid,
    contractId: Uuid,
    lockCycleId: Uuid,
  ): ContractLockDecisionCommand {
    return new ContractLockDecisionCommand(
      landlordId,
      contractId,
      lockCycleId,
      request.action,
    );
  }
}
