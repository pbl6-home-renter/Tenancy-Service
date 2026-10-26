import { DomainException } from 'shared/domain/exceptions/domain.exception';

/** The geocoding provider could not answer; the client may retry. */
export class GeocodingUnavailableException extends DomainException {
  constructor(reason: string) {
    super(`Geocoding unavailable: ${reason}`, 503, 'GEOCODING_UNAVAILABLE');
  }
}
