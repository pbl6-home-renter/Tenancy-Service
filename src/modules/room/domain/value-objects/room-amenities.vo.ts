export interface RoomAmenities {
  aircon?: boolean;
  fridge?: boolean;
  wcInside?: boolean;
  waterHeater?: boolean;
  mezzanine?: boolean;
  table?: boolean;
  chair?: boolean;
}

export const ROOM_AMENITY_KEYS = [
  'aircon',
  'fridge',
  'wcInside',
  'waterHeater',
  'mezzanine',
  'table',
  'chair',
] as const satisfies readonly (keyof RoomAmenities)[];

const roomAmenityKeySet: ReadonlySet<string> = new Set(ROOM_AMENITY_KEYS);

export function isRoomAmenityKey(key: string): key is keyof RoomAmenities {
  return roomAmenityKeySet.has(key);
}
