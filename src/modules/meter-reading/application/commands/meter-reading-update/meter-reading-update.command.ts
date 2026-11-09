import { ICommand } from '@nestjs/cqrs';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { MeterValue } from '../../../domain/value-objects/meter-value.vo';

export class MeterReadingUpdateCommand implements ICommand {
  constructor(
    readonly landlordId: Uuid,
    readonly readingId: Uuid,
    readonly currentReading?: MeterValue,
    readonly evidenceMediaIds?: readonly Uuid[],
  ) {}
}
