import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export class BulkRoomReadingResult {
  electricityReadingId: Uuid | null = null;
  electricityUsage: string | null = null;
  waterReadingId: Uuid | null = null;
  waterUsage: string | null = null;
  readonly status = 'SUCCESS' as const;
  readonly note: string | null = null;

  private constructor(
    readonly roomId: Uuid,
    readonly roomName: string,
  ) {}

  static create(roomId: Uuid, roomName: string): BulkRoomReadingResult {
    return new BulkRoomReadingResult(roomId, roomName);
  }
}

export class MeterReadingBulkCreateResult {
  private constructor(
    readonly buildingId: Uuid,
    readonly buildingName: string,
    readonly recordedMonth: string,
    readonly totalRoomsRecorded: number,
    readonly totalElectricityUsage: string,
    readonly totalWaterUsage: string,
    readonly results: BulkRoomReadingResult[],
  ) {}

  static create(input: {
    buildingId: Uuid;
    buildingName: string;
    recordedMonth: string;
    totalRoomsRecorded: number;
    totalElectricityUsage: string;
    totalWaterUsage: string;
    results: BulkRoomReadingResult[];
  }): MeterReadingBulkCreateResult {
    return new MeterReadingBulkCreateResult(
      input.buildingId,
      input.buildingName,
      input.recordedMonth,
      input.totalRoomsRecorded,
      input.totalElectricityUsage,
      input.totalWaterUsage,
      input.results,
    );
  }
}
