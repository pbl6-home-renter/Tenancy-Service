import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export interface MediaInfo {
  id: Uuid;
  ownerType: string;
  ownerId: Uuid;
  purpose: string;
  status: string;
  url?: string;
}

export interface MediaLookupPort {
  findMedia(id: Uuid): Promise<MediaInfo | null>;
  findMediaByIds(ids: readonly Uuid[]): Promise<MediaInfo[]>;
  findMediaByOwner(ownerType: string, ownerId: Uuid): Promise<MediaInfo[]>;
}

export const MEDIA_LOOKUP_PORT = Symbol('MEDIA_LOOKUP_PORT');
