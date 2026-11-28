import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export class LandlordIsLockedQuery {
  constructor(readonly landlordId: Uuid) {}
}
