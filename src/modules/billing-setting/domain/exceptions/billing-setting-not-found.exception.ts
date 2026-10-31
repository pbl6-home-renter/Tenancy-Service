import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class BillingSettingNotFoundException extends DomainException {
  constructor(id: string) {
    super(`Billing setting "${id}" not found`, 404, 'RESOURCE_NOT_FOUND');
  }
}
