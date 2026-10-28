import { IQuery } from '@nestjs/cqrs';
import { OffsetPageQuery } from 'shared/application/pagination/offset-page-query';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { MyBuildingFilter } from '../../../domain/repositories/building.repository';

export class BuildingListMineQuery implements IQuery {
  constructor(
    public readonly landlordId: Uuid,
    public readonly options: OffsetPageQuery<MyBuildingFilter>,
  ) {}
}
