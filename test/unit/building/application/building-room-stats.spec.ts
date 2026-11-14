import {
  BuildingRoomStatsReader,
  formatOccupancyRate,
} from 'modules/building/application/ports/building-room-stats.port';
import { BuildingListMineQuery } from 'modules/building/application/queries/building-list-mine/building-list-mine.query';
import { BuildingListMineQueryHandler } from 'modules/building/application/queries/building-list-mine/building-list-mine.query.handler';
import { BuildingRepository } from 'modules/building/domain/repositories/building.repository';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';

describe('building occupancy', () => {
  it.each([
    [0, 0, '0%'],
    [3, 1, '33.3%'],
    [4, 2, '50%'],
    [6, 5, '83.3%'],
  ])(
    'formats %i rooms and %i occupied as %s',
    (totalRooms, occupiedRooms, expected) => {
      expect(formatOccupancyRate({ totalRooms, occupiedRooms })).toBe(expected);
    },
  );

  it('maps one batched statistics result to each building and preserves pagination', async () => {
    const landlord = generateUuid();
    const first = { id: generateUuid() };
    const second = { id: generateUuid() };
    const page = {
      data: [first, second],
      pagination: {
        type: 'offset',
        pageNo: 2,
        pageSize: 2,
        totalItems: 5,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: true,
      },
    };
    const repository = { findMyBuildings: jest.fn().mockResolvedValue(page) };
    const reader = {
      getStats: jest
        .fn()
        .mockResolvedValue(
          new Map([[first.id, { totalRooms: 3, occupiedRooms: 1 }]]),
        ),
    };
    const handler = new BuildingListMineQueryHandler(
      repository as unknown as BuildingRepository,
      reader as BuildingRoomStatsReader,
    );
    const query = new BuildingListMineQuery(landlord, {
      pageNo: 2,
      pageSize: 2,
    });
    const result = await handler.execute(query);
    expect(reader.getStats).toHaveBeenCalledTimes(1);
    expect(reader.getStats).toHaveBeenCalledWith([first.id, second.id]);
    expect(result.data).toEqual([
      { building: first, stats: { totalRooms: 3, occupiedRooms: 1 } },
      { building: second, stats: { totalRooms: 0, occupiedRooms: 0 } },
    ]);
    expect(result.pagination).toEqual(page.pagination);
  });
});
