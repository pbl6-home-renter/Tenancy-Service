import { IQuery } from '@nestjs/cqrs';
import { OffsetPageQuery } from 'shared/application/pagination/offset-page-query';
import { AdminBuildingFilter } from '../../../domain/repositories/building.repository';

export class BuildingListForAdminQuery implements IQuery {
  constructor(public readonly options: OffsetPageQuery<AdminBuildingFilter>) {}
}
