import { GenderPolicy } from '../enums/gender-policy.enum';
import { RoomStatus } from '../enums/room-status.enum';
import { RoomAmenities } from '../value-objects/room-amenities.vo';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export interface RoomFields {
  landlordId: Uuid;
  buildingId: Uuid;
  floorNumber: number | null;
  name: string;
  description: string | null;
  area: number | null;
  amenities: RoomAmenities;
  maxOccupancy: number | null;
  genderPolicy: GenderPolicy;
  rentPrice: number;
}

export interface CreateRoomProps extends Omit<
  RoomFields,
  | 'floorNumber'
  | 'description'
  | 'area'
  | 'amenities'
  | 'maxOccupancy'
  | 'genderPolicy'
> {
  id?: Uuid;
  floorNumber?: number | null;
  description?: string | null;
  area?: number | null;
  amenities?: RoomAmenities;
  maxOccupancy?: number | null;
  genderPolicy?: GenderPolicy;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface RoomProps extends RoomFields {
  id: Uuid;
  status: RoomStatus;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

export type UpdateRoomProps = Partial<
  Pick<
    RoomFields,
    | 'floorNumber'
    | 'name'
    | 'description'
    | 'area'
    | 'amenities'
    | 'maxOccupancy'
    | 'genderPolicy'
    | 'rentPrice'
  >
>;
