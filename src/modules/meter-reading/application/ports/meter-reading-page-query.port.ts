import { OffsetPageQuery } from 'shared/application/pagination/offset-page-query';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { MeterReadingEntity } from '../../domain/entities/meter-reading.entity';
import { MeterType } from '../../domain/enums/meter-type.enum';

export interface MeterReadingPageFilter {
  roomId?: Uuid;
  type?: MeterType;
  period?: string;
}

export interface MeterReadingPageQueryPort {
  findPage(
    landlordId: Uuid,
    query: OffsetPageQuery<MeterReadingPageFilter>,
  ): Promise<PaginatedResult<MeterReadingEntity>>;
}
