import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { MEDIA_OWNERSHIP_QUERY, MediaOwnerLookupQueryHandler } from './application/queries/media-owner-lookup/media-owner-lookup.query.handler';
import { TypeOrmMediaOwnershipQuery } from './infrastructure/queries/typeorm-media-ownership.query';
import { MediaOwnershipInternalController } from './presentation/http/controllers/media-ownership-internal.controller';

@Module({
  imports: [CqrsModule],
  controllers: [MediaOwnershipInternalController],
  providers: [
    MediaOwnerLookupQueryHandler,
    TypeOrmMediaOwnershipQuery,
    { provide: MEDIA_OWNERSHIP_QUERY, useExisting: TypeOrmMediaOwnershipQuery },
  ],
})
export class MediaOwnershipModule {}
