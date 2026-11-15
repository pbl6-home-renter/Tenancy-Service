import { IQuery } from '@nestjs/cqrs';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { OffsetPageQuery } from 'shared/application/pagination/offset-page-query';

export class RoomHubListQuery implements IQuery {
  constructor(
    public readonly tenantId: Uuid,
    public readonly options: OffsetPageQuery,
  ) {}
}
