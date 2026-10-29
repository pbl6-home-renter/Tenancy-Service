import { BuildingEntity } from '../../../domain/entities/building.entity';
import type { InternalUserSummary } from '../../../infrastructure/services/internal-user.service';

export interface BuildingListForAdminResult {
  building: BuildingEntity;
  landlord?: InternalUserSummary;
}
