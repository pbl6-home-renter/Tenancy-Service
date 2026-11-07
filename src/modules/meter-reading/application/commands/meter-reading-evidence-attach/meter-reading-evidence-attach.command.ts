import { ICommand } from '@nestjs/cqrs';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export class MeterReadingEvidenceAttachCommand implements ICommand {
  constructor(
    readonly readingId: Uuid,
    readonly landlordId: Uuid,
    readonly mediaIds: readonly Uuid[],
  ) {}
}
