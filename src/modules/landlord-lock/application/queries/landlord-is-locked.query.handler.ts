import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { LANDLORD_LOCK, LandlordLockPort } from '../ports/landlord-lock.port';
import { LandlordIsLockedQuery } from './landlord-is-locked.query';

@QueryHandler(LandlordIsLockedQuery)
export class LandlordIsLockedQueryHandler implements IQueryHandler<
  LandlordIsLockedQuery,
  boolean
> {
  constructor(
    @Inject(LANDLORD_LOCK) private readonly locks: LandlordLockPort,
  ) {}

  execute(query: LandlordIsLockedQuery): Promise<boolean> {
    return this.locks.isLocked(query.landlordId);
  }
}
