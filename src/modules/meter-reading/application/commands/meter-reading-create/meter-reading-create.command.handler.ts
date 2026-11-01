import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UNIT_OF_WORK_DI_TOKEN } from 'shared/application/di-tokens';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { MeterReadingEntity } from '../../../domain/entities/meter-reading.entity';
import { MeterReadingRecorder } from '../../services/meter-reading-recorder.service';
import { MeterReadingCreateCommand } from './meter-reading-create.command';

@CommandHandler(MeterReadingCreateCommand)
export class MeterReadingCreateCommandHandler implements ICommandHandler<
  MeterReadingCreateCommand,
  MeterReadingEntity
> {
  constructor(
    private readonly recorder: MeterReadingRecorder,
    @Inject(UNIT_OF_WORK_DI_TOKEN) private readonly unitOfWork: IUnitOfWork,
  ) {}

  execute(command: MeterReadingCreateCommand): Promise<MeterReadingEntity> {
    return this.unitOfWork.run((context) =>
      this.recorder.record(command, context),
    );
  }
}
