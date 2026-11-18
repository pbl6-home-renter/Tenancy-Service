import { IQuery } from '@nestjs/cqrs';
import { OffsetPageQuery } from 'shared/application/pagination/offset-page-query';
import { GenderPolicy } from '../../../domain/enums/gender-policy.enum';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export interface PublicRoomFilter {
  province?: string;
  ward?: string;
  minPrice?: number;
  maxPrice?: number;
  genderPolicy?: GenderPolicy;
}

export class RoomPublicSearchQuery implements IQuery {
  constructor(
    public readonly options: OffsetPageQuery<PublicRoomFilter>,
    public readonly viewerId?: Uuid,
    public readonly favoritesOnly = false,
  ) {}
}
