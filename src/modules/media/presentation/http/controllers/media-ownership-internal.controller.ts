import { Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiExcludeController } from '@nestjs/swagger';
import { InternalOnly } from 'shared/presentation/decorators/auth/internal-only.decorator';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { MediaOwnerLookupQuery } from '../../../application/queries/media-owner-lookup/media-owner-lookup.query';
import { MediaOwnerType } from '../../../application/ports/media-ownership-query.port';
import { MediaOwnerUnavailableException } from '../../../domain/exceptions/media-owner-unavailable.exception';
import { ResponseCode } from 'shared/presentation/decorators/response-code.decorator';

const OWNER_TYPES: readonly MediaOwnerType[] = [
  'building', 'room', 'contract', 'contract_member', 'meter_reading',
];
const OWNERSHIP_FETCHED = 'OWNERSHIP_FETCHED';

@ApiExcludeController()
@InternalOnly()
@Controller('internal/ownership')
export class MediaOwnershipInternalController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(':ownerType/:ownerId')
  @HttpCode(HttpStatus.OK)
  @ResponseCode(OWNERSHIP_FETCHED)
  async lookup(
    @Param('ownerType') ownerType: string,
    @Param('ownerId', new ParseUUIDPipe({ errorHttpStatusCode: 422 })) ownerId: Uuid,
  ) {
    if (!OWNER_TYPES.includes(ownerType as MediaOwnerType)) {
      throw new MediaOwnerUnavailableException(ownerType, ownerId);
    }
    return this.queryBus.execute(
      new MediaOwnerLookupQuery(ownerType as MediaOwnerType, ownerId),
    );
  }
}
