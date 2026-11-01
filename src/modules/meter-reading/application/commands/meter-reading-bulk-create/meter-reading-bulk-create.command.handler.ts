import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BUILDING_DI_TOKEN } from 'modules/building/building.di-token';
import { BuildingNotFoundException } from 'modules/building/domain/exceptions/building-not-found.exception';
import { BuildingNotOwnedException } from 'modules/building/domain/exceptions/building-not-owned.exception';
import { BuildingRepository } from 'modules/building/domain/repositories/building.repository';
import { UNIT_OF_WORK_DI_TOKEN } from 'shared/application/di-tokens';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { MeterType } from '../../../domain/enums/meter-type.enum';
import { MeterValue } from '../../../domain/value-objects/meter-value.vo';
import { MeterReadingRecorder } from '../../services/meter-reading-recorder.service';
import { MeterReadingBulkCreateCommand } from './meter-reading-bulk-create.command';
import {
  BulkRoomReadingResult,
  MeterReadingBulkCreateResult,
} from './meter-reading-bulk-create.result';

@CommandHandler(MeterReadingBulkCreateCommand)
export class MeterReadingBulkCreateCommandHandler implements ICommandHandler<
  MeterReadingBulkCreateCommand,
  MeterReadingBulkCreateResult
> {
  constructor(
    @Inject(BUILDING_DI_TOKEN.REPOSITORY)
    private readonly buildings: BuildingRepository,
    @Inject(UNIT_OF_WORK_DI_TOKEN) private readonly unitOfWork: IUnitOfWork,
    private readonly recorder: MeterReadingRecorder,
  ) {}

  execute(
    command: MeterReadingBulkCreateCommand,
  ): Promise<MeterReadingBulkCreateResult> {
    return this.unitOfWork.run(async (context) => {
      const building = await this.buildings.findById(
        command.buildingId,
        context,
      );
      if (!building) throw new BuildingNotFoundException(command.buildingId);
      if (building.landlordId !== command.landlordId) {
        throw new BuildingNotOwnedException(
          command.buildingId,
          command.landlordId,
        );
      }

      const roomResults = new Map<Uuid, BulkRoomReadingResult>();
      const electricityUsages: string[] = [];
      const waterUsages: string[] = [];

      const recorded = await this.recorder.recordBulk(
        {
          landlordId: command.landlordId,
          buildingId: command.buildingId,
          period: command.recordedMonth,
          readings: command.readings,
        },
        context,
      );
      for (const { roomId, roomName, reading } of recorded) {
        let roomResult = roomResults.get(roomId);
        if (!roomResult) {
          roomResult = BulkRoomReadingResult.create(roomId, roomName);
          roomResults.set(roomId, roomResult);
        }
        const isElectricity = reading.type === MeterType.ELECTRICITY;
        const readingIdField = isElectricity
          ? 'electricityReadingId'
          : 'waterReadingId';
        const usageField = isElectricity ? 'electricityUsage' : 'waterUsage';
        const usages = isElectricity ? electricityUsages : waterUsages;

        roomResult[readingIdField] = reading.id;
        roomResult[usageField] = reading.consumption;
        usages.push(reading.consumption);
      }

      return MeterReadingBulkCreateResult.create({
        buildingId: building.id,
        buildingName: building.name,
        recordedMonth: command.recordedMonth.value,
        totalRoomsRecorded: roomResults.size,
        totalElectricityUsage: MeterValue.sum(electricityUsages),
        totalWaterUsage: MeterValue.sum(waterUsages),
        results: [...roomResults.values()],
      });
    });
  }
}
