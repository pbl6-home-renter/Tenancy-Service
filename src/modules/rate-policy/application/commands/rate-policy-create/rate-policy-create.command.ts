import { ICommand } from '@nestjs/cqrs';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { RatePolicyScope } from '../../../domain/enums/rate-policy-scope.enum';
import { RateItem } from '../../../domain/value-objects/rate-item.vo';

export class RatePolicyCreateCommand implements ICommand {
  constructor(
    readonly landlordId: Uuid,
    readonly scope: RatePolicyScope,
    readonly buildingId: Uuid | undefined,
    readonly roomId: Uuid | undefined,
    readonly rates: RateItem[],
  ) {}
}
