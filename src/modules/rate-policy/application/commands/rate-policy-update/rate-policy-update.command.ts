import { ICommand } from '@nestjs/cqrs';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { RateItem } from '../../../domain/value-objects/rate-item.vo';

export class RatePolicyUpdateCommand implements ICommand {
  constructor(
    readonly landlordId: Uuid,
    readonly policyId: Uuid,
    readonly rates?: RateItem[],
    readonly isActive?: boolean,
  ) {}
}
