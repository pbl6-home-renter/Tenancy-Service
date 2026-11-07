import { ICommand } from '@nestjs/cqrs';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export class ContractActivateCommand implements ICommand {
  constructor(
    public readonly contractId: Uuid,
    public readonly landlordId: Uuid,
    public readonly signedContractMediaIds: readonly Uuid[],
  ) {}
}
