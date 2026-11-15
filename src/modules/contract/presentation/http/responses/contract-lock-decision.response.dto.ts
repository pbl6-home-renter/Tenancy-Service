import { ApiProperty } from '@nestjs/swagger';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { LandlordLockCycleEntity } from '../../../domain/entities/landlord-lock-cycle.entity';
import { ContractLockDecisionAction } from '../../../domain/entities/landlord-lock-cycle.props';
import { ContractStatus } from '../../../domain/enums/contract-status.enum';

export class ContractLockDecisionResponseDto {
  @ApiProperty({ format: 'uuid' }) contractId: Uuid;
  @ApiProperty({ format: 'uuid' }) lockCycleId: Uuid;
  @ApiProperty({ enum: ['restore', 'terminate'] })
  action: ContractLockDecisionAction;
  @ApiProperty({ enum: [ContractStatus.ACTIVE, ContractStatus.TERMINATED] })
  status: ContractStatus;
  @ApiProperty({ format: 'date-time' }) decidedAt: string;
  @ApiProperty({
    description: 'Handover requirement recorded when the decision was made.',
  })
  handoverRequired: boolean;

  static fromDomain(
    cycle: LandlordLockCycleEntity,
    contractId: Uuid,
  ): ContractLockDecisionResponseDto {
    const decision = cycle.decisions[contractId];
    return Object.assign(new ContractLockDecisionResponseDto(), {
      contractId,
      lockCycleId: cycle.id,
      action: decision.action,
      status:
        decision.action === 'restore'
          ? ContractStatus.ACTIVE
          : ContractStatus.TERMINATED,
      decidedAt: decision.decidedAt,
      handoverRequired: decision.action === 'terminate',
    });
  }
}
