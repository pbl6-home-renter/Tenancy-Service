import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export class ContractDraftDocumentGenerateQuery {
  constructor(
    readonly contractId: Uuid,
    readonly landlordId: Uuid,
  ) {}
}
