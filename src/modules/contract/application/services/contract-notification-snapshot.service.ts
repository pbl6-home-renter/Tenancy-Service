import { Inject, Injectable } from '@nestjs/common';
import { RoomRepository } from 'modules/room/domain/repositories/room.repository';
import { ROOM_DI_TOKEN } from 'modules/room/room.di-token';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { ContractEntity } from '../../domain/entities/contract.entity';
import { ContractNotificationSnapshot } from '../../domain/events/contract-notification-snapshot';

@Injectable()
export class ContractNotificationSnapshotService {
  constructor(
    @Inject(ROOM_DI_TOKEN.REPOSITORY)
    private readonly rooms: RoomRepository,
  ) {}

  async create(
    contracts: readonly ContractEntity[],
    context: TransactionContext,
  ): Promise<ContractNotificationSnapshot[]> {
    const snapshots: ContractNotificationSnapshot[] = [];
    for (const contract of contracts) {
      const room = await this.rooms.findById(contract.roomId, context);
      snapshots.push({
        contractId: contract.id,
        contractCode: `HD-${contract.id.slice(0, 6)}`,
        // A deleted room must not prevent lock reconciliation or termination.
        roomName: room?.name ?? null,
      });
    }
    return snapshots;
  }
}
