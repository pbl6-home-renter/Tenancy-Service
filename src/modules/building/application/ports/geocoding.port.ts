export interface GeocodeAddressInput {
  address: string;
  ward: string;
  province: string;
}

export interface GeocodedCoordinate {
  latitude: number;
  longitude: number;
}

/**
 * Resolves a Building address to coordinates. Creation resolves coordinates
 * before opening a transaction. Updates resolve them after locking and
 * validating the Building, keeping that transaction open during the HTTP call.
 *
 * Rejects with `GeocodingFailedException` (address cannot be located, 422) or
 * `GeocodingUnavailableException` (provider down, timed out or misconfigured, 503).
 */
export interface IGeocodingPort {
  geocode(input: GeocodeAddressInput): Promise<GeocodedCoordinate>;
}
