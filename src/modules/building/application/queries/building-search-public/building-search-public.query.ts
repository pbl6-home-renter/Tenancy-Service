import { IQuery } from '@nestjs/cqrs';
import { OffsetPageQuery } from 'shared/application/pagination/offset-page-query';
import { PublicBuildingFilter } from '../../../domain/repositories/building.repository';

export class BuildingSearchPublicQuery implements IQuery {
  constructor(public readonly options: OffsetPageQuery<PublicBuildingFilter>) {}
}
