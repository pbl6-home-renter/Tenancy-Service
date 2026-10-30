import { ICommand } from '@nestjs/cqrs';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { RateItem } from '../../../domain/value-objects/rate-item.vo';

export class BuildingRatePoliciesBatchCommand implements ICommand {
  constructor(
    readonly landlordId: Uuid,
    readonly buildingId: Uuid,
    readonly rates: RateItem[],
  ) {}
}
