import { TenantSummary } from 'modules/roommate-profile/application/ports/tenant-directory.port';
import { MatchRequestEntity } from '../domain/entities/match-request.entity';

export interface MatchRequestListItemResult {
  request: MatchRequestEntity;
  requester: TenantSummary;
  target: TenantSummary;
}
