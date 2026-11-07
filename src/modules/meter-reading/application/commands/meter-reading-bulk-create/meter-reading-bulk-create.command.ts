import { ICommand } from '@nestjs/cqrs';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { MeterType } from '../../../domain/enums/meter-type.enum';
import { MeterValue } from '../../../domain/value-objects/meter-value.vo';
import { ReadingPeriod } from '../../../domain/value-objects/reading-period.vo';

export interface BulkReadingInput {
  roomId: Uuid;
  type: MeterType;
  currentReading: MeterValue;
  evidenceMediaIds: Uuid[];
}

export class MeterReadingBulkCreateCommand implements ICommand {
  constructor(
    readonly landlordId: Uuid,
    readonly buildingId: Uuid,
    readonly recordedMonth: ReadingPeriod,
    readonly readings: ReadonlyMap<string, BulkReadingInput>,
  ) {}
}
