import { ICommand } from '@nestjs/cqrs';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export class BuildingUpdateCommand implements ICommand {
  constructor(
    public readonly landlordId: Uuid,
    public readonly buildingId: Uuid,
    public readonly name?: string,
    public readonly address?: string,
  ) {}
}
