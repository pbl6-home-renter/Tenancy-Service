import { IQuery } from '@nestjs/cqrs';
import { AuthenticatedUser } from 'shared/application/auth/authenticated-user';
import { OffsetPageQuery } from 'shared/application/pagination/offset-page-query';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export class ContractMemberListQuery implements IQuery {
  constructor(
    public readonly contractId: Uuid,
    public readonly user: AuthenticatedUser,
    public readonly options: OffsetPageQuery,
  ) {}
}
