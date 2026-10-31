import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { MeterReadingPageQueryPort } from '../../ports/meter-reading-page-query.port';
import { MeterReadingEntity } from '../../../domain/entities/meter-reading.entity';
import { METER_READING_DI_TOKEN } from '../../../meter-reading.di-token';
import { MeterReadingListQuery } from './meter-reading-list.query';

@QueryHandler(MeterReadingListQuery)
export class MeterReadingListQueryHandler implements IQueryHandler<
  MeterReadingListQuery,
  PaginatedResult<MeterReadingEntity>
> {
  constructor(
    @Inject(METER_READING_DI_TOKEN.PAGE_QUERY)
    private readonly readings: MeterReadingPageQueryPort,
  ) {}

  execute(
    query: MeterReadingListQuery,
  ): Promise<PaginatedResult<MeterReadingEntity>> {
    return this.readings.findPage(query.landlordId, query.options);
  }
}
