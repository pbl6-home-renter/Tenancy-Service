import { AggregateRoot } from 'shared/domain/base/aggregate-root';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import {
  generateUuid,
  isValidUuid,
  Uuid,
} from 'shared/domain/value-objects/uuid.vo';
import { MeterType } from '../enums/meter-type.enum';
import { MeterReadingRecordedEvent } from '../events/meter-reading-recorded.event';
import { MeterReadingUpdatedEvent } from '../events/meter-reading-updated.event';
import { CurrentReadingInvalidException } from '../exceptions/current-reading-invalid.exception';
import { MeterValue } from '../value-objects/meter-value.vo';
import { ReadingPeriod } from '../value-objects/reading-period.vo';
import { MediaReference } from 'modules/media/domain/value-objects/media-reference.vo';
import {
  MeterReadingProps,
  MeterReadingRecordProps,
} from './meter-reading.props';

export class MeterReadingEntity extends AggregateRoot {
  private constructor(
    id: Uuid,
    readonly landlordId: Uuid,
    readonly buildingId: Uuid,
    readonly roomId: Uuid,
    readonly type: MeterType,
    readonly period: ReadingPeriod,
    readonly previousReading: MeterValue,
    private _currentReading: MeterValue,
    readonly isBaseline: boolean,
    private _evidenceMedia: MediaReference[],
    createdAt: Date,
    updatedAt: Date,
    isDeleted: boolean,
  ) {
    super(id, createdAt, updatedAt, isDeleted);
  }

  static record(input: MeterReadingRecordProps): MeterReadingEntity {
    const now = new Date();
    const reading = MeterReadingEntity.reconstitute({
      ...input,
      period: input.period.value,
      previousReading: input.previousReading.value,
      currentReading: input.currentReading.value,
      id: generateUuid(),
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    });
    reading.addDomainEvent(
      new MeterReadingRecordedEvent(
        reading.id,
        reading.roomId,
        reading.buildingId,
        reading.type,
        reading.period.value,
        reading.previousReading.value,
        reading.currentReading.value,
      ),
    );
    return reading;
  }

  static reconstitute(props: MeterReadingProps): MeterReadingEntity {
    if (
      ![props.id, props.landlordId, props.buildingId, props.roomId].every(
        isValidUuid,
      )
    ) {
      throw new ValidationException('Meter reading IDs must be UUIDs');
    }
    if (
      !Array.isArray(props.evidenceMediaIds) ||
      !props.evidenceMediaIds.every(isValidUuid)
    )
      throw new ValidationException(
        'evidenceMediaIds must contain valid UUIDs',
      );
    if (new Set(props.evidenceMediaIds).size !== props.evidenceMediaIds.length)
      throw new ValidationException('evidenceMediaIds must be unique');
    if (!Object.values(MeterType).includes(props.type)) {
      throw new ValidationException('Invalid meter type');
    }
    const period = ReadingPeriod.create(props.period);
    const previous = MeterValue.create(props.previousReading);
    const current = MeterValue.create(props.currentReading);
    if (current.cents < previous.cents)
      throw new CurrentReadingInvalidException();
    if (typeof props.isBaseline !== 'boolean') {
      throw new ValidationException('isBaseline must be boolean');
    }
    return new MeterReadingEntity(
      props.id,
      props.landlordId,
      props.buildingId,
      props.roomId,
      props.type,
      period,
      previous,
      current,
      props.isBaseline,
      props.evidenceMediaIds.map(MediaReference.create),
      new Date(props.createdAt),
      new Date(props.updatedAt),
      props.isDeleted,
    );
  }

  get consumption(): string {
    return MeterValue.difference(this.currentReading, this.previousReading);
  }

  get currentReading(): MeterValue {
    return this._currentReading;
  }

  get evidenceMediaIds(): Uuid[] {
    return this._evidenceMedia.map((reference) => reference.mediaId);
  }

  update(
    currentReading?: MeterValue,
    evidenceMediaIds?: readonly Uuid[],
  ): void {
    if (currentReading && currentReading.cents < this.previousReading.cents)
      throw new CurrentReadingInvalidException();
    if (
      evidenceMediaIds !== undefined &&
      (!evidenceMediaIds.every(isValidUuid) ||
        new Set(evidenceMediaIds).size !== evidenceMediaIds.length)
    )
      throw new ValidationException(
        'evidenceMediaIds must be unique valid UUIDs',
      );
    if (currentReading) this._currentReading = currentReading;
    if (evidenceMediaIds !== undefined)
      this._evidenceMedia = evidenceMediaIds.map(MediaReference.create);
    this.recordUpdate();
  }

  private recordUpdate(): void {
    this.updatedAt.setTime(Date.now());
    this.addDomainEvent(
      new MeterReadingUpdatedEvent(
        this.id,
        this.roomId,
        this.buildingId,
        this.type,
        this.period.value,
        this.previousReading.value,
        this.currentReading.value,
        this.evidenceMediaIds,
      ),
    );
  }
}
