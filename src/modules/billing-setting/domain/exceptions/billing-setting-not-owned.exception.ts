import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class BillingSettingNotOwnedException extends DomainException {
  constructor(id: string) {
    super(
      `Billing setting "${id}" does not belong to this landlord`,
      403,
      'FORBIDDEN',
    );
  }
}
