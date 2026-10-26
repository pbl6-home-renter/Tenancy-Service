import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class BuildingNoteRequiredException extends DomainException {
  constructor() {
    super('A rejection note is required', 422, 'NOTE_REQUIRED');
  }
}
