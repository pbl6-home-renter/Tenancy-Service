import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { MeterType } from '../enums/meter-type.enum';
import { MeterValue } from '../value-objects/meter-value.vo';
import { ReadingPeriod } from '../value-objects/reading-period.vo';

export interface MeterReadingRecordProps {
  landlordId: Uuid;
  buildingId: Uuid;
  roomId: Uuid;
  type: MeterType;
  period: ReadingPeriod;
  previousReading: MeterValue;
  currentReading: MeterValue;
  isBaseline: boolean;
  evidenceMediaId: Uuid;
}

export interface MeterReadingProps extends Omit<
  MeterReadingRecordProps,
  'period' | 'previousReading' | 'currentReading'
> {
  period: string;
  previousReading: string;
  currentReading: string;
  id: Uuid;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}
