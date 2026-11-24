export interface AdminDashboardResult {
  totalBuildings: number;
  pendingApprovalBuildings: number;
  rejectedBuildings: number;
  totalRooms: number;
  roomsByStatus: {
    available: number;
    occupied: number;
    maintenance: number;
  };
  occupancyRate: number;
  generatedAt: string;
}
