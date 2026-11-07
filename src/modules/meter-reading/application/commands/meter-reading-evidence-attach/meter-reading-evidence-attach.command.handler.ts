import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  MEDIA_LOOKUP_PORT,
  MediaLookupPort,
} from 'modules/media/application/ports/media-lookup.port';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { METER_READING_DI_TOKEN } from '../../../meter-reading.di-token';
import { MeterReadingRepository } from '../../../domain/repositories/meter-reading.repository';
import { MeterReadingEntity } from '../../../domain/entities/meter-reading.entity';
import { MeterReadingEvidenceAttachCommand } from './meter-reading-evidence-attach.command';

@CommandHandler(MeterReadingEvidenceAttachCommand)
export class MeterReadingEvidenceAttachCommandHandler implements ICommandHandler<
  MeterReadingEvidenceAttachCommand,
  MeterReadingEntity
> {
  constructor(
    @Inject(METER_READING_DI_TOKEN.REPOSITORY)
    private readonly readings: MeterReadingRepository,
    @Inject(MEDIA_LOOKUP_PORT) private readonly media: MediaLookupPort,
  ) {}

  async execute(
    command: MeterReadingEvidenceAttachCommand,
  ): Promise<MeterReadingEntity> {
    const reading = await this.readings.findById(command.readingId);
    if (!reading || reading.landlordId !== command.landlordId) {
      throw new ValidationException('Meter reading is unavailable');
    }
    const media = await this.media.findMediaByIds(command.mediaIds);
    const validIds = new Set(
      media
        .filter(
          (item) =>
            item.ownerType === 'meter_reading' &&
            item.ownerId === reading.id &&
            item.purpose === 'meter_reading_evidence' &&
            item.status === 'uploaded',
        )
        .map((item) => item.id),
    );
    if (validIds.size !== new Set(command.mediaIds).size) {
      throw new ValidationException(
        'Evidence media must belong to this meter reading',
      );
    }
    reading.attachEvidence([...command.mediaIds]);
    await this.readings.save(reading);
    return reading;
  }
}
