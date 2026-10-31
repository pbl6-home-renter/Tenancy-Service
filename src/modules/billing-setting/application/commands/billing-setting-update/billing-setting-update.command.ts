import { ICommand } from '@nestjs/cqrs';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export class BillingSettingUpdateCommand implements ICommand {
  constructor(
    readonly landlordId: Uuid,
    readonly settingId: Uuid,
    readonly paymentDueDay?: number,
    readonly remindDay?: number | null,
    readonly botEnabled?: boolean,
    readonly isActive?: boolean,
  ) {}
}
