import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { BuildingStatus } from 'modules/building/domain/enums/building-status.enum';
import { RoomStatus } from 'modules/room/domain/enums/room-status.enum';
import { DashboardReader } from '../../ports/dashboard-reader.port';
import { DASHBOARD_READER } from '../../../dashboard.di-token';
import { AdminDashboardQuery } from './admin-dashboard.query';
import { AdminDashboardResult } from './admin-dashboard.result';

@QueryHandler(AdminDashboardQuery)
export class AdminDashboardQueryHandler implements IQueryHandler<
  AdminDashboardQuery,
  AdminDashboardResult
> {
  constructor(
    @Inject(DASHBOARD_READER) private readonly reader: DashboardReader,
  ) {}

  async execute(): Promise<AdminDashboardResult> {
    const counts = await this.reader.readCounts();
    const roomsByStatus = {
      available: counts.rooms[RoomStatus.AVAILABLE] ?? 0,
      occupied: counts.rooms[RoomStatus.OCCUPIED] ?? 0,
      maintenance: counts.rooms[RoomStatus.MAINTENANCE] ?? 0,
    };
    const totalRooms = Object.values(roomsByStatus).reduce(
      (total, count) => total + count,
      0,
    );
    return {
      totalBuildings: counts.buildings[BuildingStatus.APPROVED] ?? 0,
      pendingApprovalBuildings: counts.buildings[BuildingStatus.PENDING] ?? 0,
      rejectedBuildings: counts.buildings[BuildingStatus.REJECTED] ?? 0,
      totalRooms,
      roomsByStatus,
      occupancyRate:
        totalRooms === 0
          ? 0
          : Math.round((roomsByStatus.occupied / totalRooms) * 1000) / 10,
      generatedAt: new Date().toISOString(),
    };
  }
}
