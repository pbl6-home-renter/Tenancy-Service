import { IQuery } from '@nestjs/cqrs';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export class BuildingGetPublicQuery implements IQuery {
  constructor(public readonly buildingId: Uuid) {}
}
