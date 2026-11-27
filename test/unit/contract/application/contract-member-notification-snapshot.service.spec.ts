import { ContractMemberNotificationSnapshotService } from 'modules/contract/application/services/contract-member-notification-snapshot.service';
import { BuildingRepository } from 'modules/building/domain/repositories/building.repository';
import { RoomRepository } from 'modules/room/domain/repositories/room.repository';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';
import {
  createContract,
  createLinkDependencies,
} from '../support/contract-link.fixture';

describe('ContractMemberNotificationSnapshotService', () => {
  it('captures room and building names inside the business transaction', async () => {
    const { context } = createLinkDependencies();
    const contract = createContract();
    const buildingId = generateUuid();
    const rooms = {
      findById: jest.fn(async () => ({ buildingId, name: 'Room A' })),
    };
    const buildings = {
      findById: jest.fn(async () => ({ name: 'Building A' })),
    };
    const service = new ContractMemberNotificationSnapshotService(
      rooms as unknown as RoomRepository,
      buildings as unknown as BuildingRepository,
    );

    expect(await service.create(contract, context)).toEqual({
      contractId: contract.id,
      contractCode: `HD-${contract.id.slice(0, 6)}`,
      roomName: 'Room A',
      buildingName: 'Building A',
    });
    expect(rooms.findById).toHaveBeenCalledWith(contract.roomId, context);
    expect(buildings.findById).toHaveBeenCalledWith(buildingId, context);
  });
});
