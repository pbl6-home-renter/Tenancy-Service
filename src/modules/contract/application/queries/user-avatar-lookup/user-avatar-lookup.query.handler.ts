import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { CONTRACT_DI_TOKEN } from '../../../contract.di-token';
import { UserAvatarLookupPort } from '../../ports/user-avatar-lookup.port';
import { UserAvatarLookupQuery } from './user-avatar-lookup.query';

/** Lower-cased user id → avatar URL. */
export type UserAvatarUrls = ReadonlyMap<string, string>;

@QueryHandler(UserAvatarLookupQuery)
export class UserAvatarLookupQueryHandler implements IQueryHandler<
  UserAvatarLookupQuery,
  UserAvatarUrls
> {
  constructor(
    @Inject(CONTRACT_DI_TOKEN.USER_AVATAR_LOOKUP)
    private readonly users: UserAvatarLookupPort,
  ) {}

  execute({ userIds }: UserAvatarLookupQuery): Promise<UserAvatarUrls> {
    return this.users.findAvatarUrls(
      userIds.filter((id): id is Uuid => id !== null),
    );
  }
}
