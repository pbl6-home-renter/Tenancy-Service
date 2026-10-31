import { IQuery } from '@nestjs/cqrs';
import { OffsetPageQuery } from 'shared/application/pagination/offset-page-query';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { MeterReadingPageFilter } from '../../ports/meter-reading-page-query.port';

export class MeterReadingListQuery implements IQuery {
  constructor(
    readonly landlordId: Uuid,
    readonly options: OffsetPageQuery<MeterReadingPageFilter>,
  ) {}
}
