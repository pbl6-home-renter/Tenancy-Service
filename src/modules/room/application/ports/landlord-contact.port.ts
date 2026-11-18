import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export interface LandlordContact {
  id: Uuid;
  name: string;
  phone: string;
}

export interface LandlordContactPort {
  findById(id: Uuid): Promise<LandlordContact | null>;
}
