import { IQuery } from '@nestjs/cqrs';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export class BuildingGetMineQuery implements IQuery {
  constructor(
    public readonly landlordId: Uuid,
    public readonly buildingId: Uuid,
  ) {}
}
