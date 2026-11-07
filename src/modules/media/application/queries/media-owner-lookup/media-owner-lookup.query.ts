import { IQuery } from '@nestjs/cqrs';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { MediaOwnerType } from '../../ports/media-ownership-query.port';

export class MediaOwnerLookupQuery implements IQuery {
  constructor(
    readonly ownerType: MediaOwnerType,
    readonly ownerId: Uuid,
  ) {}
}
