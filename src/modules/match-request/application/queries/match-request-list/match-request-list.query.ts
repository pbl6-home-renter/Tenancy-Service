import { IQuery } from '@nestjs/cqrs';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { MatchRequestStatus } from '../../../domain/enums/match-request-status.enum';

export class MatchRequestListQuery implements IQuery {
  constructor(
    readonly actorId: Uuid,
    readonly options: {
      pageNo: number;
      pageSize: number;
      direction?: 'incoming' | 'outgoing';
      status?: MatchRequestStatus;
    },
  ) {}
}
