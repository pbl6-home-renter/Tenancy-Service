import { ICommand } from '@nestjs/cqrs';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export class BuildingCreateCommand implements ICommand {
  constructor(
    public readonly landlordId: Uuid,
    public readonly name: string,
    public readonly province: string,
    public readonly ward: string,
    public readonly address: string,
  ) {}
}
