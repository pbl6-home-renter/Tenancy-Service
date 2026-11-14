import { Uuid } from 'shared/domain/value-objects/uuid.vo';

/** Avatar URLs owned by Identity Service, for display only. */
export interface UserAvatarLookupPort {
  /**
   * Avatar URL by lower-cased user id. Best effort: users without an avatar are
   * left out and an unavailable Identity Service yields an empty map.
   */
  findAvatarUrls(userIds: readonly Uuid[]): Promise<Map<string, string>>;
}
