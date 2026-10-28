import { ICommand } from '@nestjs/cqrs';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export interface BuildingCreateInput {
  name: string;
  province: string;
  ward: string;
  address: string;
}

export class BuildingCreateCommand implements ICommand {
  constructor(
    public readonly landlordId: Uuid,
    public readonly name: string,
    public readonly province: string,
    public readonly ward: string,
    public readonly address: string,
  ) {}

  static create(
    landlordId: Uuid,
    input: BuildingCreateInput,
  ): BuildingCreateCommand {
    return new BuildingCreateCommand(
      landlordId,
      input.name,
      input.province,
      input.ward,
      input.address,
    );
  }
}
