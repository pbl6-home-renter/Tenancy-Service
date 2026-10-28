import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { BuildingStatus } from 'modules/building/domain/enums/building-status.enum';
import { RoomStatus } from '../../../domain/enums/room-status.enum';
import { RoomAmenities } from '../../../domain/value-objects/room-amenities.vo';
import { RoomPublicSearchResult } from '../room-public-search/room-public-search.result';

export interface RoomDetailResult extends RoomPublicSearchResult {
  buildingName: string;
  buildingStatus: BuildingStatus | null;
  buildingIsDeleted: boolean | null;
  landlordId: Uuid;
  description: string | null;
  floorNumber: number | null;
  depositAmount: number;
  status: RoomStatus;
  maxOccupancy: number | null;
  amenities: RoomAmenities;
}

export type RoomDetailAccessResult = Pick<
  RoomDetailResult,
  'landlordId' | 'buildingStatus' | 'buildingIsDeleted'
>;
