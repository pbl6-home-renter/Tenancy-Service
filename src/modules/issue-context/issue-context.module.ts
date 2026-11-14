import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ISSUE_CONTEXT_QUERY } from './application/ports/issue-context-query.port';
import { IssueContextLookupQueryHandler } from './application/queries/issue-context-lookup-internal/issue-context-lookup.query.handler';
import { IssueContextListQueryHandler } from './application/queries/issue-context-list-internal/issue-context-list.query.handler';
import { TypeOrmIssueContextQuery } from './infrastructure/queries/typeorm-issue-context.query';
import { IssueContextInternalController } from './presentation/http/controllers/issue-context-internal.controller';

@Module({
  imports: [CqrsModule],
  controllers: [IssueContextInternalController],
  providers: [
    IssueContextLookupQueryHandler,
    IssueContextListQueryHandler,
    TypeOrmIssueContextQuery,
    { provide: ISSUE_CONTEXT_QUERY, useExisting: TypeOrmIssueContextQuery },
  ],
})
export class IssueContextModule {}
