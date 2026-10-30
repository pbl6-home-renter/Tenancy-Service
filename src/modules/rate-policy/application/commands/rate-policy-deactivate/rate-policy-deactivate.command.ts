import { ICommand } from '@nestjs/cqrs';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export class RatePolicyDeactivateCommand implements ICommand {
  constructor(
    readonly landlordId: Uuid,
    readonly policyId: Uuid,
  ) {}
}
