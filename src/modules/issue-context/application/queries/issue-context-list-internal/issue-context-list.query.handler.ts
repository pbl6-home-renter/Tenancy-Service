import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import {
  ISSUE_CONTEXT_QUERY,
  IssueContextQueryPort,
} from '../../ports/issue-context-query.port';
import { IssueContextListQuery } from './issue-context-list.query';

@QueryHandler(IssueContextListQuery)
export class IssueContextListQueryHandler implements IQueryHandler<IssueContextListQuery> {
  constructor(
    @Inject(ISSUE_CONTEXT_QUERY)
    private readonly contexts: IssueContextQueryPort,
  ) {}

  execute(query: IssueContextListQuery): Promise<Uuid[]> {
    return this.contexts.findVisibleContractIds(query.userId, query.role);
  }
}
