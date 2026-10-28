import { IQuery } from '@nestjs/cqrs';
import { OffsetPageQuery } from 'shared/application/pagination/offset-page-query';
import { GenderPolicy } from '../../../domain/enums/gender-policy.enum';

export interface PublicRoomFilter {
  province?: string;
  ward?: string;
  minPrice?: number;
  maxPrice?: number;
  genderPolicy?: GenderPolicy;
}

export class RoomPublicSearchQuery implements IQuery {
  constructor(public readonly options: OffsetPageQuery<PublicRoomFilter>) {}
}
