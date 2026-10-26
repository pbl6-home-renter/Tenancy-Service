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
 * Resolves a Building address to coordinates. Call it before `unitOfWork.run()`
 * so no transaction is held open during the HTTP call.
 *
 * Rejects with `GeocodingFailedException` (address cannot be located, 422) or
 * `GeocodingUnavailableException` (provider down, timed out or misconfigured, 503).
 */
export interface IGeocodingPort {
  geocode(input: GeocodeAddressInput): Promise<GeocodedCoordinate>;
}
