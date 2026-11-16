import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class RoommateProfileNotFoundException extends DomainException {
  constructor() {
    super('Roommate profile not found', 404, 'ROOMMATE_PROFILE_NOT_FOUND');
  }
}
