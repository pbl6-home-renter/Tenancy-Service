import { ICommand } from '@nestjs/cqrs';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { UpdateContractProps } from '../../../domain/entities/contract.props';

export class ContractUpdateCommand implements ICommand {
  constructor(
    public readonly contractId: Uuid,
    public readonly landlordId: Uuid,
    public readonly updates: UpdateContractProps,
  ) {}
}
