import { AdminDashboardQueryHandler } from 'modules/dashboard/application/queries/admin-dashboard/admin-dashboard.query.handler';
import { DashboardReader } from 'modules/dashboard/application/ports/dashboard-reader.port';
import { BuildingStatus } from 'modules/building/domain/enums/building-status.enum';
import { RoomStatus } from 'modules/room/domain/enums/room-status.enum';

describe('AdminDashboardQueryHandler', () => {
  const reader: jest.Mocked<DashboardReader> = { readCounts: jest.fn() };
  const handler = new AdminDashboardQueryHandler(reader);

  it('returns every contract field and calculates occupancy from approved rooms', async () => {
    reader.readCounts.mockResolvedValueOnce({
      buildings: {
        [BuildingStatus.APPROVED]: 2,
        [BuildingStatus.PENDING]: 2,
        [BuildingStatus.REJECTED]: 1,
      },
      rooms: {
        [RoomStatus.AVAILABLE]: 2,
        [RoomStatus.OCCUPIED]: 5,
        [RoomStatus.MAINTENANCE]: 1,
      },
    });
    const result = await handler.execute();
    expect(result).toMatchObject({
      totalBuildings: 2,
      pendingApprovalBuildings: 2,
      rejectedBuildings: 1,
      totalRooms: 8,
      roomsByStatus: { available: 2, occupied: 5, maintenance: 1 },
      occupancyRate: 62.5,
    });
    expect(new Date(result.generatedAt).toISOString()).toBe(result.generatedAt);
  });

  it('rounds to one decimal place and supplies missing status groups', async () => {
    reader.readCounts.mockResolvedValueOnce({
      buildings: {},
      rooms: {
        [RoomStatus.AVAILABLE]: 2,
        [RoomStatus.OCCUPIED]: 1,
      },
    });
    expect(await handler.execute()).toMatchObject({
      totalBuildings: 0,
      totalRooms: 3,
      roomsByStatus: { available: 2, occupied: 1, maintenance: 0 },
      occupancyRate: 33.3,
    });
  });

  it('returns zero rate when there are no rooms', async () => {
    reader.readCounts.mockResolvedValueOnce({ buildings: {}, rooms: {} });
    expect(await handler.execute()).toMatchObject({
      totalRooms: 0,
      roomsByStatus: { available: 0, occupied: 0, maintenance: 0 },
      occupancyRate: 0,
    });
  });
});
