import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export class ContractTemplateApplyCommand {
  constructor(
    readonly contractId: Uuid,
    readonly landlordId: Uuid,
    readonly templateKey: string,
  ) {}
}
