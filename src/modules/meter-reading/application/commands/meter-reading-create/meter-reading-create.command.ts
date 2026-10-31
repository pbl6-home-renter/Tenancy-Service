import { ICommand } from '@nestjs/cqrs';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { MeterType } from '../../../domain/enums/meter-type.enum';
import { MeterValue } from '../../../domain/value-objects/meter-value.vo';
import { ReadingPeriod } from '../../../domain/value-objects/reading-period.vo';

export class MeterReadingCreateCommand implements ICommand {
  constructor(
    readonly landlordId: Uuid,
    readonly roomId: Uuid,
    readonly type: MeterType,
    readonly period: ReadingPeriod,
    readonly currentReading: MeterValue,
    readonly isBaseline: boolean,
    readonly evidenceMediaId: Uuid,
  ) {}
}
