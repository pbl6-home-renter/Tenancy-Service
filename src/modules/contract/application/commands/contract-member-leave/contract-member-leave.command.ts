import { ICommand } from '@nestjs/cqrs';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export class ContractMemberLeaveCommand implements ICommand {
  constructor(
    public readonly tenantId: Uuid,
    public readonly contractId: Uuid,
    public readonly landlordId: Uuid,
    public readonly leftOn: Date,
  ) {}
}
