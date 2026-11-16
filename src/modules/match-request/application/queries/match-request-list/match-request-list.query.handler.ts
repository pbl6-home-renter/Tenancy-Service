import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { MatchRequestService } from '../../match-request.service';
import { MatchRequestListQuery } from './match-request-list.query';

@QueryHandler(MatchRequestListQuery)
export class MatchRequestListQueryHandler implements IQueryHandler<MatchRequestListQuery> {
  constructor(private readonly service: MatchRequestService) {}
  execute(query: MatchRequestListQuery) {
    return this.service.list(query.actorId, query.options);
  }
}
