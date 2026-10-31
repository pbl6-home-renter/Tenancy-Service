import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class ActiveSettingExistsException extends DomainException {
  constructor() {
    super(
      'A billing setting already exists for this target',
      409,
      'ACTIVE_SETTING_EXISTS',
    );
  }
}
