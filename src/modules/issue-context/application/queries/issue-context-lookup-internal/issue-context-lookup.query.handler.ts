import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  ISSUE_CONTEXT_QUERY,
  IssueContext,
  IssueContextQueryPort,
} from '../../ports/issue-context-query.port';
import { IssueContextLookupQuery } from './issue-context-lookup.query';

@QueryHandler(IssueContextLookupQuery)
export class IssueContextLookupQueryHandler implements IQueryHandler<IssueContextLookupQuery> {
  constructor(
    @Inject(ISSUE_CONTEXT_QUERY)
    private readonly contexts: IssueContextQueryPort,
  ) {}

  execute(query: IssueContextLookupQuery): Promise<IssueContext | null> {
    return query.by === 'room'
      ? this.contexts.findByRoom(query.id)
      : this.contexts.findByContract(query.id);
  }
}
