import { ICommand } from '@nestjs/cqrs';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import type { UpdateBuildingRequest } from '../../../presentation/http/requests/update-building.request';

export class BuildingUpdateCommand implements ICommand {
  constructor(
    public readonly landlordId: Uuid,
    public readonly buildingId: Uuid,
    public readonly name?: string,
    public readonly address?: string,
  ) {}

  static create(
    landlordId: Uuid,
    buildingId: Uuid,
    request: UpdateBuildingRequest,
  ): BuildingUpdateCommand {
    return new BuildingUpdateCommand(
      landlordId,
      buildingId,
      request.name,
      request.address,
    );
  }
}
