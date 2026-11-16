import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export class ContractTenantGetByIdQuery {
  constructor(
    readonly landlordId: Uuid,
    readonly contractMemberId: Uuid,
  ) {}
}
