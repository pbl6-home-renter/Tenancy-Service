import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { MeterReadingEntity } from '../../../domain/entities/meter-reading.entity';
import { MeterReadingUpdateCommandHandler } from '../meter-reading-update/meter-reading-update.command.handler';
import { MeterReadingUpdateCommand } from '../meter-reading-update/meter-reading-update.command';
import { MeterReadingEvidenceAttachCommand } from './meter-reading-evidence-attach.command';

@CommandHandler(MeterReadingEvidenceAttachCommand)
export class MeterReadingEvidenceAttachCommandHandler implements ICommandHandler<
  MeterReadingEvidenceAttachCommand,
  MeterReadingEntity
> {
  constructor(private readonly updater: MeterReadingUpdateCommandHandler) {}

  async execute(
    command: MeterReadingEvidenceAttachCommand,
  ): Promise<MeterReadingEntity> {
    return this.updater.execute(
      new MeterReadingUpdateCommand(
        command.landlordId,
        command.readingId,
        undefined,
        command.mediaIds,
      ),
    );
  }
}
