import { RoommateProfileRecord } from '../../domain/roommate-profile.types';
import { OffsetPageQuery } from 'shared/application/pagination/offset-page-query';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';

export interface RoommateProfileReadPort {
  findDiscoverable(id: string): Promise<RoommateProfileRecord | null>;
  findCandidateTenantIds(
    viewerId: string,
    preferredArea?: string,
  ): Promise<string[]>;
  findPage(
    viewerId: string,
    activeTenantIds: string[],
    options: OffsetPageQuery<{ preferredArea?: string }>,
  ): Promise<PaginatedResult<RoommateProfileRecord>>;
}
