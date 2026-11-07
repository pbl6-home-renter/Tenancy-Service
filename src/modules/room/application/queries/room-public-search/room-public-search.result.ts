import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { GenderPolicy } from '../../../domain/enums/gender-policy.enum';

export interface RoomPublicSearchResult {
  id: Uuid;
  photoMediaIds: Uuid[];
  photoUrls: string[];
  buildingId: Uuid;
  name: string;
  area: string | null;
  rentPrice: number;
  genderPolicy: GenderPolicy;
  address: string;
  province: string;
  ward: string;
}
