import { Inject, Injectable } from '@nestjs/common';
import { BUILDING_DI_TOKEN } from 'modules/building/building.di-token';
import { BuildingRepository } from 'modules/building/domain/repositories/building.repository';
import { RoomRepository } from 'modules/room/domain/repositories/room.repository';
import { ROOM_DI_TOKEN } from 'modules/room/room.di-token';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { ContractEntity } from '../../domain/entities/contract.entity';

@Injectable()
export class ContractMemberNotificationSnapshotService {
  constructor(
    @Inject(ROOM_DI_TOKEN.REPOSITORY) private readonly rooms: RoomRepository,
    @Inject(BUILDING_DI_TOKEN.REPOSITORY)
    private readonly buildings: BuildingRepository,
  ) {}

  async create(contract: ContractEntity, context: TransactionContext) {
    const room = await this.rooms.findById(contract.roomId, context);
    const building = room
      ? await this.buildings.findById(room.buildingId, context)
      : null;
    return {
      contractId: contract.id,
      contractCode: `HD-${contract.id.slice(0, 6)}`,
      roomName: room?.name ?? null,
      buildingName: building?.name ?? null,
    };
  }
}
