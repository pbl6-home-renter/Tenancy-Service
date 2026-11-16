import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { MatchRequestEntity } from '../../domain/entities/match-request.entity';
import { MatchRequestStatus } from '../../domain/enums/match-request-status.enum';

export interface MatchRequestPageQueryPort {
  findPage(
    actorId: Uuid,
    options: {
      pageNo: number;
      pageSize: number;
      direction?: 'incoming' | 'outgoing';
      status?: MatchRequestStatus;
    },
  ): Promise<PaginatedResult<MatchRequestEntity>>;
}
