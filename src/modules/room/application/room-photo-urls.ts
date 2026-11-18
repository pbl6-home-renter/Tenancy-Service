import { MediaInfo } from 'modules/media/application/ports/media-lookup.port';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

/** Only completed photos belonging to this room are displayable; metadata API paths are not images. */
export function roomPhotoUrls(
  roomId: Uuid,
  photoIds: readonly Uuid[],
  media: readonly MediaInfo[],
): string[] {
  const urls = new Map(
    media
      .filter(
        (item) =>
          item.ownerType === 'room' &&
          item.ownerId === roomId &&
          item.status === 'uploaded' &&
          ['cover_photo', 'gallery_photo'].includes(item.purpose) &&
          item.url &&
          /^https?:\/\//i.test(item.url),
      )
      .map((item) => [item.id, item.url!]),
  );
  return photoIds.flatMap((id) => (urls.has(id) ? [urls.get(id)!] : []));
}
