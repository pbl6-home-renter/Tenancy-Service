import { OffsetPageQuery } from 'shared/application/pagination/offset-page-query';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { RoomHubListResult } from '../queries/room-hub-list/room-hub-list.result';

export interface RoomHubPageQueryPort {
  findPage(
    tenantId: Uuid,
    options: OffsetPageQuery,
  ): Promise<PaginatedResult<RoomHubListResult>>;
}
