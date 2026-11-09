import { ICommand } from '@nestjs/cqrs';
import { ReadingPeriod } from 'modules/meter-reading/domain/value-objects/reading-period.vo';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export class InvoiceGenerateCommand implements ICommand {
  constructor(
    readonly landlordId: Uuid,
    readonly buildingId: Uuid,
    readonly period: ReadingPeriod,
  ) {}
}
