import { ApiProperty } from '@nestjs/swagger';
import { AdminDashboardResult } from '../../../application/queries/admin-dashboard/admin-dashboard.result';

export class RoomsByStatusResponseDto {
  @ApiProperty({ minimum: 0 })
  available: number;

  @ApiProperty({ minimum: 0 })
  occupied: number;

  @ApiProperty({ minimum: 0 })
  maintenance: number;
}

export class DashboardResponseDto implements AdminDashboardResult {
  @ApiProperty({ minimum: 0 })
  totalBuildings: number;

  @ApiProperty({ minimum: 0 })
  pendingApprovalBuildings: number;

  @ApiProperty({ minimum: 0 })
  rejectedBuildings: number;

  @ApiProperty({ minimum: 0 })
  totalRooms: number;

  @ApiProperty({ type: RoomsByStatusResponseDto })
  roomsByStatus: RoomsByStatusResponseDto;

  @ApiProperty({ minimum: 0, maximum: 100 })
  occupancyRate: number;

  @ApiProperty({ type: String, format: 'date-time' })
  generatedAt: string;
}
