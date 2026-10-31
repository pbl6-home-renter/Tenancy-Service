import { ICommand } from '@nestjs/cqrs';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { BillingSettingScope } from '../../../domain/enums/billing-setting-scope.enum';

export class BillingSettingCreateCommand implements ICommand {
  constructor(
    readonly landlordId: Uuid,
    readonly scope: BillingSettingScope,
    readonly buildingId: Uuid | undefined,
    readonly roomId: Uuid | undefined,
    readonly paymentDueDay: number | undefined,
    readonly remindDay: number | null | undefined,
    readonly botEnabled: boolean | undefined,
  ) {}
}
