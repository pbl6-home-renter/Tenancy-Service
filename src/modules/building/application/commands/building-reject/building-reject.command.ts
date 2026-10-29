import { ICommand } from '@nestjs/cqrs';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export class BuildingRejectCommand implements ICommand {
  constructor(
    public readonly adminId: Uuid,
    public readonly buildingId: Uuid,
    public readonly note: string,
  ) {}
}
