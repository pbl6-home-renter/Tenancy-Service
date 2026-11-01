import { IQuery } from '@nestjs/cqrs';
import { OffsetPageQuery } from 'shared/application/pagination/offset-page-query';

export class ContractTemplateListQuery implements IQuery {
  constructor(public readonly options: OffsetPageQuery) {}
}
