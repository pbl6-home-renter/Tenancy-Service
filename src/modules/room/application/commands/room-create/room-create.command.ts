import { ICommand } from '@nestjs/cqrs';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { GenderPolicy } from '../../../domain/enums/gender-policy.enum';
import { RoomAmenities } from '../../../domain/value-objects/room-amenities.vo';

export class RoomCreateCommand implements ICommand {
  constructor(
    public readonly landlordId: Uuid,
    public readonly buildingId: Uuid,
    public readonly name: string,
    public readonly floorNumber: number,
    public readonly area: number,
    public readonly rentPrice: number,
    public readonly depositAmount: number,
    public readonly genderPolicy: GenderPolicy,
    public readonly maxOccupancy: number | null | undefined,
    public readonly amenities: RoomAmenities | undefined,
  ) {}
}
