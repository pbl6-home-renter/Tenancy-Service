import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ContractLockDecisionAction } from '../../../domain/entities/landlord-lock-cycle.props';

export class ContractLockDecisionCommand {
  constructor(
    readonly landlordId: Uuid,
    readonly contractId: Uuid,
    readonly lockCycleId: Uuid,
    readonly action: ContractLockDecisionAction,
  ) {}
}
