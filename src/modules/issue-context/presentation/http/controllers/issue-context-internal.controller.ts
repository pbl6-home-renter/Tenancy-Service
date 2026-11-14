import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  ParseEnumPipe,
  Query,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiExcludeController } from '@nestjs/swagger';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { UserRole } from 'shared/domain/enums/user-role.enum';
import { InternalOnly } from 'shared/presentation/decorators/auth/internal-only.decorator';
import { IssueContext } from '../../../application/ports/issue-context-query.port';
import { IssueContextLookupQuery } from '../../../application/queries/issue-context-lookup-internal/issue-context-lookup.query';
import { IssueContextListQuery } from '../../../application/queries/issue-context-list-internal/issue-context-list.query';

@ApiExcludeController()
@InternalOnly()
@Controller('internal/issue-context')
export class IssueContextInternalController {
  constructor(private readonly queries: QueryBus) {}

  @Get('rooms/:roomId')
  async byRoom(
    @Param('roomId', ParseUUIDPipe) roomId: Uuid,
  ): Promise<IssueContext> {
    return this.lookup(new IssueContextLookupQuery('room', roomId));
  }

  @Get('contracts/:contractId')
  async byContract(
    @Param('contractId', ParseUUIDPipe) contractId: Uuid,
  ): Promise<IssueContext> {
    return this.lookup(new IssueContextLookupQuery('contract', contractId));
  }

  @Get('users/:userId/contracts')
  visibleContracts(
    @Param('userId', ParseUUIDPipe) userId: Uuid,
    @Query('role', new ParseEnumPipe(UserRole)) role: UserRole,
  ): Promise<Uuid[]> {
    return this.queries.execute(new IssueContextListQuery(userId, role));
  }

  private async lookup(query: IssueContextLookupQuery): Promise<IssueContext> {
    const result: IssueContext | null = await this.queries.execute(query);
    if (!result) throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND' });
    return result;
  }
}
